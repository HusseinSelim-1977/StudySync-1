require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { Kafka } = require('kafkajs');

const {
  createProducer,
  createConsumer,
  TOPICS,
  formatMessage
} = require(path.join(__dirname, '../shared/kafka'));

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

let kafkaProducer;
let kafkaConsumer;

// ---------------- KAFKA WAIT ----------------

const waitForKafka = async (retries = 20) => {
  const kafka = new Kafka({
    clientId: 'health-check',
    brokers: ['kafka:9092'],
  });

  const admin = kafka.admin();

  while (retries) {
    try {
      await admin.connect();
      await admin.disconnect();
      console.log('✅ Kafka ready');
      return;
    } catch {
      console.log('⏳ Waiting for Kafka...');
      retries--;
      await new Promise(res => setTimeout(res, 3000));
    }
  }

  throw new Error('Kafka never became ready');
};

// ---------------- HELPERS ----------------

const sendResponse = async (topic, correlationId, payload) => {
  if (!topic || !correlationId) {
    console.warn('⚠️ Missing replyTo or correlationId');
    return;
  }

  try {
    await kafkaProducer.send({
      topic,
      messages: [
        {
          value: JSON.stringify({ correlationId, payload }),
        },
      ],
    });

    console.log('📤 Response sent →', topic);
  } catch (err) {
    console.error('❌ Failed to send response:', err.message);
  }
};

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ---------------- MESSAGE HANDLER ----------------

const handleMessage = async (parsed) => {
  const { eventName, payload, correlationId, replyTo } = parsed;

  console.log('📥 EVENT:', eventName);

  try {
    // -------- REGISTER --------
    if (eventName === TOPICS.REGISTER_USER) {
      const { email, password, name, university, academicYear, contactEmail, contactPhone } = payload || {};

      if (!email || !password || !name) {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'Missing required fields',
        });
      }

      if (!isValidEmail(email)) {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'Invalid email format',
        });
      }

      const existing = await prisma.user.findUnique({ where: { email } });

      if (existing) {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'Email already exists',
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          university,
          academicYear,
          contactEmail,
          contactPhone,
        },
      });

      await kafkaProducer.send({
        topic: TOPICS.USER_REGISTERED,
        messages: [
          {
            value: JSON.stringify(
              formatMessage(TOPICS.USER_REGISTERED, 'user-service', {
                userId: user.id,
                email: user.email,
                name: user.name,
              })
            ),
          },
        ],
      });

      const { passwordHash: _, ...safeUser } = user;

      return sendResponse(replyTo, correlationId, {
        success: true,
        data: { user: safeUser },
      });
    }

    // -------- LOGIN --------
    if (eventName === TOPICS.LOGIN_USER) {
      const { email, password } = payload || {};

      if (!email || !password) {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'Email and password required',
        });
      }

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'Invalid credentials',
        });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);

      if (!valid) {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'Invalid credentials',
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      const refreshToken = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return sendResponse(replyTo, correlationId, {
        success: true,
        data: { token, refreshToken, userId: user.id },
      });
    }

    // -------- GET USER --------
    if (eventName === TOPICS.GET_USER) {
      const { userId } = payload || {};

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'User not found',
        });
      }

      const { passwordHash: _, ...safeUser } = user;

      return sendResponse(replyTo, correlationId, {
        success: true,
        data: { user: safeUser },
      });
    }

    // -------- UPDATE USER --------
    if (eventName === TOPICS.UPDATE_USER) {
      const { userId, ...updates } = payload || {};

      if (!userId) {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'userId required',
        });
      }

      delete updates.passwordHash;
      delete updates.email;

      const user = await prisma.user.update({
        where: { id: userId },
        data: updates,
      });

      const { passwordHash: _, ...safeUser } = user;

      return sendResponse(replyTo, correlationId, {
        success: true,
        data: { user: safeUser },
      });
    }

    // -------- SEND BUDDY REQUEST --------
    if (eventName === TOPICS.SEND_BUDDY_REQUEST) {
      const { senderId, receiverId } = payload || {};

      if (!senderId || !receiverId) {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'senderId and receiverId required',
        });
      }

      if (senderId === receiverId) {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'Cannot send request to yourself',
        });
      }

      // Check if receiver exists
      const receiver = await prisma.user.findUnique({
        where: { id: receiverId },
      });

      if (!receiver) {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'Receiver not found',
        });
      }

      // Check if request already exists
      const existing = await prisma.buddyRequest.findUnique({
        where: {
          senderId_receiverId: {
            senderId,
            receiverId,
          },
        },
      });

      if (existing) {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'Request already sent',
        });
      }

      const request = await prisma.buddyRequest.create({
        data: {
          senderId,
          receiverId,
          status: 'PENDING',
        },
      });

      // Publish event for notification service
      await kafkaProducer.send({
        topic: TOPICS.BUDDY_REQUEST_SENT,
        messages: [
          {
            value: JSON.stringify(
              formatMessage(TOPICS.BUDDY_REQUEST_SENT, 'user-service', {
                requestId: request.id,
                senderId,
                receiverId,
              })
            ),
          },
        ],
      });

      return sendResponse(replyTo, correlationId, {
        success: true,
        data: { request },
      });
    }

    // -------- ACCEPT BUDDY REQUEST --------
    if (eventName === TOPICS.ACCEPT_BUDDY_REQUEST) {
      const { requestId, userId } = payload || {};

      if (!requestId || !userId) {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'requestId and userId required',
        });
      }

      const request = await prisma.buddyRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'Request not found',
        });
      }

      if (request.receiverId !== userId) {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'Not authorized to accept this request',
        });
      }

      if (request.status !== 'PENDING') {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'Request already processed',
        });
      }

      const updated = await prisma.buddyRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' },
      });

      // Publish event for notification service
      await kafkaProducer.send({
        topic: TOPICS.BUDDY_REQUEST_ACCEPTED,
        messages: [
          {
            value: JSON.stringify(
              formatMessage(TOPICS.BUDDY_REQUEST_ACCEPTED, 'user-service', {
                requestId: updated.id,
                senderId: updated.senderId,
                receiverId: updated.receiverId,
              })
            ),
          },
        ],
      });

      return sendResponse(replyTo, correlationId, {
        success: true,
        data: { request: updated },
      });
    }

    // -------- DECLINE BUDDY REQUEST --------
    if (eventName === TOPICS.DECLINE_BUDDY_REQUEST) {
      const { requestId, userId } = payload || {};

      if (!requestId || !userId) {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'requestId and userId required',
        });
      }

      const request = await prisma.buddyRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'Request not found',
        });
      }

      if (request.receiverId !== userId) {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'Not authorized to decline this request',
        });
      }

      if (request.status !== 'PENDING') {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'Request already processed',
        });
      }

      const updated = await prisma.buddyRequest.update({
        where: { id: requestId },
        data: { status: 'DECLINED' },
      });

      return sendResponse(replyTo, correlationId, {
        success: true,
        data: { request: updated },
      });
    }

    // -------- GET BUDDY REQUESTS --------
    if (eventName === TOPICS.GET_BUDDY_REQUESTS) {
      const { userId } = payload || {};

      if (!userId) {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'userId required',
        });
      }

      const requests = await prisma.buddyRequest.findMany({
        where: {
          receiverId: userId,
          status: 'PENDING',
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              university: true,
              academicYear: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return sendResponse(replyTo, correlationId, {
        success: true,
        data: { requests },
      });
    }

    // -------- GET BUDDIES --------
    if (eventName === TOPICS.GET_BUDDIES) {
      const { userId } = payload || {};

      if (!userId) {
        return sendResponse(replyTo, correlationId, {
          success: false,
          error: 'userId required',
        });
      }

      // Get accepted requests where user is either sender or receiver
      const sentRequests = await prisma.buddyRequest.findMany({
        where: {
          senderId: userId,
          status: 'ACCEPTED',
        },
        include: {
          receiver: {
            select: {
              id: true,
              name: true,
              email: true,
              university: true,
              academicYear: true,
            },
          },
        },
      });

      const receivedRequests = await prisma.buddyRequest.findMany({
        where: {
          receiverId: userId,
          status: 'ACCEPTED',
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              university: true,
              academicYear: true,
            },
          },
        },
      });

      // Combine and format buddies
      const buddies = [
        ...sentRequests.map(r => r.receiver),
        ...receivedRequests.map(r => r.sender),
      ];

      return sendResponse(replyTo, correlationId, {
        success: true,
        data: { buddies },
      });
    }

    console.warn('⚠️ Unknown event:', eventName);
  } catch (err) {
    console.error('❌ Handler error:', err);

    return sendResponse(replyTo, correlationId, {
      success: false,
      error: err.message,
    });
  }
};

// ---------------- CONSUMER WITH RETRY ----------------

const startConsumer = async () => {
  while (true) {
    try {
      console.log('🔄 Starting consumer...');

      kafkaConsumer = createConsumer('user-service');

      await kafkaConsumer.connect();

      const topics = [
        TOPICS.REGISTER_USER,
        TOPICS.LOGIN_USER,
        TOPICS.GET_USER,
        TOPICS.UPDATE_USER,
        TOPICS.SEND_BUDDY_REQUEST,
        TOPICS.ACCEPT_BUDDY_REQUEST,
        TOPICS.DECLINE_BUDDY_REQUEST,
        TOPICS.GET_BUDDY_REQUESTS,
        TOPICS.GET_BUDDIES,
      ];

      for (const topic of topics) {
        if (!topic) throw new Error('Topic undefined');
        await kafkaConsumer.subscribe({ topic, fromBeginning: false });
      }

      await kafkaConsumer.run({
        eachMessage: async ({ message }) => {
          try {
            const parsed = JSON.parse(message.value.toString());
            await handleMessage(parsed);
          } catch (err) {
            console.error('❌ Invalid message:', err.message);
          }
        },
      });

      console.log('✅ Consumer running');
      return;

    } catch (err) {
      console.error('❌ Consumer crashed, retrying...', err.message);
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

// ---------------- START ----------------

const start = async () => {
  console.log('🚀 User service booting...');

  await waitForKafka();

  kafkaProducer = createProducer();
  await kafkaProducer.connect();

  await startConsumer();

  console.log('✅ User Service Ready');
};

start().catch(err => {
  console.error('❌ Fatal startup error:', err);
  process.exit(1);
});

// ---------------- SHUTDOWN ----------------

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});