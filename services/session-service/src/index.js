require('dotenv').config({ path: '../../.env' });
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const path = require('path');
const { createProducer, TOPICS, formatMessage } = require(path.resolve(__dirname, '../../../shared/kafka'));

const app = express();
app.use(express.json());
const prisma = new PrismaClient();

const PORT = process.env.SESSION_SERVICE_PORT || 4005;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

let kafkaProducer;

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
  res.json({ status: 'ok', service: 'session-service', timestamp: new Date().toISOString() });
});

app.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const creatorId = req.user.id;
    const { title, topic, dateTime, duration, sessionType, meetingLink, location, maxParticipants } = req.body;

    const session = await prisma.session.create({
      data: {
        title, topic, creatorId, dateTime: new Date(dateTime), duration, sessionType, meetingLink, location, maxParticipants
      }
    });

    // Auto join the creator
    await prisma.sessionParticipant.create({
      data: { sessionId: session.id, userId: creatorId }
    });

    try {
      const msg = formatMessage(TOPICS.SESSION_CREATED, 'session-service', session);
      await kafkaProducer.send({
        topic: TOPICS.SESSION_CREATED,
        messages: [{ value: JSON.stringify(msg) }]
      });
    } catch (err) {
      console.error('Failed to dispatch SESSION_CREATED', err);
    }

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const { topic, type } = req.query;
    const filter = { status: 'ACTIVE' };
    if (topic) filter.topic = topic;
    if (type) filter.sessionType = type;

    const sessions = await prisma.session.findMany({ where: filter, include: { participants: true } });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: { participants: true }
    });
    if (!session) return res.status(404).json({ error: 'Not found' });
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/sessions/:id/join', authenticateToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;

    const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { participants: true } });
    if (!session) return res.status(404).json({ error: 'Not found' });
    if (session.status === 'CANCELLED') return res.status(400).json({ error: 'Session is cancelled' });
    if (session.participants.length >= session.maxParticipants) return res.status(400).json({ error: 'Session is full' });

    const existing = session.participants.find(p => p.userId === userId);
    if (existing) return res.status(400).json({ error: 'Already joined' });

    const participant = await prisma.sessionParticipant.create({
      data: { sessionId, userId }
    });

    try {
      const msg = formatMessage(TOPICS.SESSION_JOINED, 'session-service', { sessionId, userId, session });
      await kafkaProducer.send({
        topic: TOPICS.SESSION_JOINED,
        messages: [{ value: JSON.stringify(msg) }]
      });
    } catch (err) {
      console.error('Failed to dispatch SESSION_JOINED', err);
    }

    res.json(participant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/sessions/:id/leave', authenticateToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ error: 'Not found' });

    if (session.creatorId === userId) {
      // Creator is leaving -> cancel the session
      await prisma.session.update({
        where: { id: sessionId },
        data: { status: 'CANCELLED' }
      });

      try {
        const msg = formatMessage(TOPICS.SESSION_CANCELLED, 'session-service', { sessionId, creatorId: userId });
        await kafkaProducer.send({
          topic: TOPICS.SESSION_CANCELLED,
          messages: [{ value: JSON.stringify(msg) }]
        });
      } catch (err) { }
      return res.json({ message: 'Session cancelled' });
    } else {
      // Normal participant deletes their joined record
      await prisma.sessionParticipant.deleteMany({
        where: { sessionId, userId }
      });
      return res.json({ message: 'Left session' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const startServer = async () => {
  try {
    kafkaProducer = createProducer('session-service');
    await kafkaProducer.connect();
    app.listen(PORT, () => console.log(`Session Service listening on port ${PORT}`));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  await kafkaProducer.disconnect();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  await kafkaProducer.disconnect();
  process.exit(0);
});
