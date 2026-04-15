require('dotenv').config({ path: '../../.env' });
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const path = require('path');
const { createProducer, TOPICS, formatMessage } = require(path.resolve(__dirname, '../../../shared/kafka'));

const app = express();
app.use(express.json());
const prisma = new PrismaClient();

const PORT = process.env.PROFILE_SERVICE_PORT || 4002;
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
  res.json({ status: 'ok', service: 'profile-service', timestamp: new Date().toISOString() });
});

app.get('/profile/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/profile/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const { courses, topics, studyPace, studyMode, groupSize, studyStyle } = req.body;

    const profile = await prisma.profile.upsert({
      where: { userId },
      update: { courses, topics, studyPace, studyMode, groupSize, studyStyle },
      create: { userId, courses, topics, studyPace, studyMode, groupSize, studyStyle }
    });

    try {
      const msg = formatMessage(TOPICS.PREFERENCES_UPDATED, 'profile-service', profile);
      await kafkaProducer.send({
        topic: TOPICS.PREFERENCES_UPDATED,
        messages: [{ value: JSON.stringify(msg) }]
      });
    } catch (kafkaErr) {
      console.error('Failed to dispatch PREFERENCES_UPDATED event', kafkaErr);
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const startServer = async () => {
  try {
    kafkaProducer = createProducer('profile-service');
    await kafkaProducer.connect();
    app.listen(PORT, () => console.log(`Profile Service listening on port ${PORT}`));
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