require('dotenv').config({ path: '../../.env' });
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const path = require('path');
const { createConsumer, TOPICS } = require(path.resolve(__dirname, '../../../shared/kafka'));

const app = express();
app.use(express.json());
const prisma = new PrismaClient();

const PORT = process.env.NOTIFICATION_SERVICE_PORT || 4006;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

let kafkaConsumer;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: 'Token invalid or expired' });
    req.user = user;
    next();
  });
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service', timestamp: new Date().toISOString() });
});

app.get('/notifications/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification) return res.status(404).json({ error: 'Not found' });
    if (notification.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const handleKafkaEvent = async (eventName, payload) => {
  try {
    switch (eventName) {
      case TOPICS.MATCH_FOUND:
        await prisma.notification.createMany({
          data: [
            { userId: payload.userId1, type: 'MATCH', title: 'New Match Found!', body: `You matched with a study buddy with score ${payload.score}.` },
            { userId: payload.userId2, type: 'MATCH', title: 'New Match Found!', body: `You matched with a study buddy with score ${payload.score}.` }
          ]
        });
        break;
      case TOPICS.SESSION_JOINED:
        if (payload.session && payload.session.creatorId !== payload.userId) {
          await prisma.notification.create({
            data: { userId: payload.session.creatorId, type: 'SESSION', title: 'New Session Participant', body: `Someone joined your session: ${payload.session.title}` }
          });
        }
        break;
      case TOPICS.SESSION_CANCELLED:
        // Assume we don't know participants list in the payload directly. In a real system, session-service might broadcast the list of userIds
        // We will just alert the creator if they cancelled, or we rely on the payload containing { userId, ... }
        if (payload.creatorId) {
            await prisma.notification.create({
              data: { userId: payload.creatorId, type: 'SESSION', title: 'Session Cancelled', body: `Your session was cancelled.` }
            });
        }
        break;
    }
  } catch (err) {
    console.error(`Failed to handle ${eventName} in notification-service`, err);
  }
};

const startServer = async () => {
  try {
    kafkaConsumer = createConsumer('notification-service-group');
    // await kafkaConsumer.connect();
    // await kafkaConsumer.subscribe({ topic: TOPICS.MATCH_FOUND, fromBeginning: true });
    // await kafkaConsumer.subscribe({ topic: TOPICS.SESSION_JOINED, fromBeginning: true });
    // await kafkaConsumer.subscribe({ topic: TOPICS.SESSION_CANCELLED, fromBeginning: true });
    
    /*
    await kafkaConsumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const msg = JSON.parse(message.value.toString());
        await handleKafkaEvent(msg.eventName, msg.payload);
      }
    });
    */

    app.listen(PORT, () => console.log(`Notification Service listening on port ${PORT}`));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
