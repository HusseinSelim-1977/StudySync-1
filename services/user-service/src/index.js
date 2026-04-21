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