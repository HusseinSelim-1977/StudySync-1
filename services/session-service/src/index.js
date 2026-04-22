require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const path = require('path');

const {
  createProducer,
  createConsumer,
  TOPICS,
  formatMessage
} = require(path.resolve(__dirname, '../../../shared/kafka'));

const prisma = new PrismaClient();

let kafkaProducer;
let kafkaConsumer;

// ---------------- HELPERS ----------------

const sendResponse = async (topic, correlationId, payload) => {
  if (!topic || !correlationId) return;
  await kafkaProducer.send({
    topic,
    messages: [{ value: JSON.stringify({ correlationId, payload }) }]
  });
};

// ---------------- START ----------------

const start = async () => {
  kafkaProducer = createProducer();
  kafkaConsumer = createConsumer('session-service');

  await kafkaProducer.connect();
  await kafkaConsumer.connect();

  const topics = [
    TOPICS.CREATE_SESSION,
    TOPICS.GET_SESSIONS,
    TOPICS.GET_SESSION,
    TOPICS.JOIN_SESSION,
    TOPICS.LEAVE_SESSION,
  ];

  for (const topic of topics) {
    await kafkaConsumer.subscribe({ topic, fromBeginning: false });
  }

  await kafkaConsumer.run({
    eachMessage: async ({ message }) => {
      const { eventName, payload, correlationId, replyTo } =
        JSON.parse(message.value.toString());

      try {

        // ---------------- CREATE SESSION ----------------
        if (eventName === TOPICS.CREATE_SESSION) {
          const {
            title, topic, creatorId, dateTime, duration,
            sessionType, meetingLink, location, maxParticipants, invitedUserIds
          } = payload;

          if (!title || !topic || !creatorId || !dateTime || !duration || !sessionType) {
            return sendResponse(replyTo, correlationId, {
              success: false, error: 'Missing required fields'
            });
          }

          const session = await prisma.session.create({
            data: {
              title,
              topic,
              creatorId,
              dateTime: new Date(dateTime),
              duration,
              sessionType: sessionType.toUpperCase(),
              meetingLink: meetingLink || null,
              location: location || null,
              maxParticipants: maxParticipants || 10,
              invitedUserIds: invitedUserIds || [],
            }
          });

          // auto-add creator as participant
          await prisma.sessionParticipant.create({
            data: { sessionId: session.id, userId: creatorId }
          });

          await kafkaProducer.send({
            topic: TOPICS.SESSION_CREATED,
            messages: [{
              value: JSON.stringify(
                formatMessage(TOPICS.SESSION_CREATED, 'session-service', {
                  sessionId: session.id,
                  creatorId,
                  title: session.title,
                  invitedUserIds: session.invitedUserIds
                })
              )
            }]
          });

          return sendResponse(replyTo, correlationId, {
            success: true, data: { session }
          });
        }

        // ---------------- GET SESSIONS (mine) ----------------
        if (eventName === TOPICS.GET_SESSIONS) {
          const { userId } = payload;

          const participations = await prisma.sessionParticipant.findMany({
            where: { userId },
            include: {
              session: {
                include: { participants: true }
              }
            },
            orderBy: { joinedAt: 'desc' }
          });

          const sessions = participations.map(p => p.session);

          return sendResponse(replyTo, correlationId, {
            success: true, data: { sessions }
          });
        }

        // ---------------- GET SESSION (single) ----------------
        if (eventName === TOPICS.GET_SESSION) {
          const { sessionId } = payload;

          const session = await prisma.session.findUnique({
            where: { id: sessionId },
            include: { participants: true }
          });

          if (!session) {
            return sendResponse(replyTo, correlationId, {
              success: false, error: 'Session not found'
            });
          }

          return sendResponse(replyTo, correlationId, {
            success: true, data: { session }
          });
        }

        // ---------------- JOIN SESSION ----------------
        if (eventName === TOPICS.JOIN_SESSION) {
          const { sessionId, userId } = payload;

          const session = await prisma.session.findUnique({
            where: { id: sessionId },
            include: { participants: true }
          });

          if (!session) {
            return sendResponse(replyTo, correlationId, {
              success: false, error: 'Session not found'
            });
          }

          if (session.status === 'CANCELLED') {
            return sendResponse(replyTo, correlationId, {
              success: false, error: 'Session is cancelled'
            });
          }

          if (session.participants.length >= session.maxParticipants) {
            return sendResponse(replyTo, correlationId, {
              success: false, error: 'Session is full'
            });
          }

          const existing = await prisma.sessionParticipant.findUnique({
            where: { sessionId_userId: { sessionId, userId } }
          });

          if (existing) {
            return sendResponse(replyTo, correlationId, {
              success: false, error: 'Already joined'
            });
          }

          const participant = await prisma.sessionParticipant.create({
            data: { sessionId, userId }
          });

          await kafkaProducer.send({
            topic: TOPICS.SESSION_JOINED,
            messages: [{
              value: JSON.stringify(
                formatMessage(TOPICS.SESSION_JOINED, 'session-service', {
                  sessionId,
                  userId,
                  creatorId: session.creatorId
                })
              )
            }]
          });

          return sendResponse(replyTo, correlationId, {
            success: true, data: { participant }
          });
        }

        // ---------------- LEAVE SESSION ----------------
        if (eventName === TOPICS.LEAVE_SESSION) {
          const { sessionId, userId } = payload;

          await prisma.sessionParticipant.deleteMany({
            where: { sessionId, userId }
          });

          return sendResponse(replyTo, correlationId, {
            success: true, data: { success: true }
          });
        }

      } catch (err) {
        console.error('Session service error:', err);
        if (replyTo && correlationId) {
          return sendResponse(replyTo, correlationId, {
            success: false, error: err.message
          });
        }
      }
    }
  });

  console.log('✅ Session Service Ready');
};

start();

process.on('SIGINT', async () => { await prisma.$disconnect(); process.exit(0); });
process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0); });
