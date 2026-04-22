require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const path = require('path');

const {
  createConsumer,
  createProducer,
  TOPICS
} = require(path.resolve(__dirname, '../../../shared/kafka'));

const prisma = new PrismaClient();

let kafkaConsumer;
let kafkaProducer;

// ---------------- HANDLER ----------------

const handleEvent = async (eventName, payload) => {
  try {

    // -------- MATCH FOUND --------
    if (eventName === TOPICS.MATCH_FOUND) {
      const { userId1, userId2, score } = payload;

      if (!userId1 || !userId2) return;

      await prisma.notification.createMany({
        data: [
          {
            userId: userId1,
            type: 'MATCH',
            title: 'New Match Found 🎯',
            body: `You matched with a study buddy (score: ${score})`
          },
          {
            userId: userId2,
            type: 'MATCH',
            title: 'New Match Found 🎯',
            body: `You matched with a study buddy (score: ${score})`
          }
        ]
      });
    }

    // -------- SESSION JOINED --------
    if (eventName === TOPICS.SESSION_JOINED) {
      const { creatorId, userId } = payload;

      if (!creatorId || creatorId === userId) return;

      await prisma.notification.create({
        data: {
          userId: creatorId,
          type: 'SESSION',
          title: 'Someone joined your session',
          body: `A new participant joined your session`
        }
      });
    }

    // -------- SESSION CANCELLED --------
    if (eventName === TOPICS.SESSION_CANCELLED) {
      const { creatorId } = payload;

      if (!creatorId) return;

      await prisma.notification.create({
        data: {
          userId: creatorId,
          type: 'SESSION',
          title: 'Session cancelled',
          body: `Your session has been cancelled`
        }
      });
    }

    // -------- MESSAGE SENT (optional hook) --------
    if (eventName === TOPICS.MESSAGE_SENT) {
      const { recipientId } = payload;

      if (!recipientId) return;

      await prisma.notification.create({
        data: {
          userId: recipientId,
          type: 'MESSAGE',
          title: 'New message 💬',
          body: `You received a new message`
        }
      });
    }

  } catch (err) {
    console.error(`Notification error (${eventName}):`, err);
  }
};

// ---------------- START ----------------

const start = async () => {
  kafkaConsumer = createConsumer('notification-service');
  kafkaProducer = createProducer();

  await kafkaConsumer.connect();
  await kafkaProducer.connect();

  // subscribe to all relevant events
  await kafkaConsumer.subscribe({ topic: TOPICS.MATCH_FOUND });
  await kafkaConsumer.subscribe({ topic: TOPICS.SESSION_JOINED });
  await kafkaConsumer.subscribe({ topic: TOPICS.SESSION_CANCELLED });
  await kafkaConsumer.subscribe({ topic: TOPICS.MESSAGE_SENT });
  await kafkaConsumer.subscribe({ topic: TOPICS.GET_NOTIFICATIONS });
  await kafkaConsumer.subscribe({ topic: TOPICS.MARK_NOTIFICATION_READ });
  await kafkaConsumer.subscribe({ topic: TOPICS.MARK_ALL_NOTIFICATIONS_READ });

  await kafkaConsumer.run({
    eachMessage: async ({ message }) => {
      const msg = JSON.parse(message.value.toString());
      const { eventName, payload, correlationId, replyTo } = msg;

      // -------- QUERY: GET NOTIFICATIONS --------
      if (eventName === TOPICS.GET_NOTIFICATIONS) {
        try {
          const { userId, unreadOnly } = payload;
          const notifications = await prisma.notification.findMany({
            where: { userId, ...(unreadOnly && { isRead: false }) },
            orderBy: { createdAt: 'desc' },
            take: 50
          });
          await kafkaProducer.send({
            topic: replyTo,
            messages: [{ value: JSON.stringify({ correlationId, payload: { success: true, data: { notifications } } }) }]
          });
        } catch (err) {
          await kafkaProducer.send({
            topic: replyTo,
            messages: [{ value: JSON.stringify({ correlationId, payload: { success: false, error: err.message } }) }]
          });
        }
        return;
      }

      // -------- QUERY: MARK ONE READ --------
      if (eventName === TOPICS.MARK_NOTIFICATION_READ) {
        try {
          const { id, userId } = payload;
          const notification = await prisma.notification.update({
            where: { id },
            data: { isRead: true }
          });
          await kafkaProducer.send({
            topic: replyTo,
            messages: [{ value: JSON.stringify({ correlationId, payload: { success: true, data: { notification } } }) }]
          });
        } catch (err) {
          await kafkaProducer.send({
            topic: replyTo,
            messages: [{ value: JSON.stringify({ correlationId, payload: { success: false, error: err.message } }) }]
          });
        }
        return;
      }

      // -------- QUERY: MARK ALL READ --------
      if (eventName === TOPICS.MARK_ALL_NOTIFICATIONS_READ) {
        try {
          const { userId } = payload;
          await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true }
          });
          await kafkaProducer.send({
            topic: replyTo,
            messages: [{ value: JSON.stringify({ correlationId, payload: { success: true, data: { success: true } } }) }]
          });
        } catch (err) {
          await kafkaProducer.send({
            topic: replyTo,
            messages: [{ value: JSON.stringify({ correlationId, payload: { success: false, error: err.message } }) }]
          });
        }
        return;
      }

      await handleEvent(eventName, payload);
    }
  });

  console.log('✅ Notification Service Ready');
};

start();

// graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});