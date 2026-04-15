require('dotenv').config({ path: '../../.env' });
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const path = require('path');
const { createProducer, createConsumer, TOPICS, formatMessage } = require(path.resolve(__dirname, '../../../shared/kafka'));

const app = express();
app.use(express.json());
const prisma = new PrismaClient();

const PORT = process.env.MATCHING_SERVICE_PORT || 4004;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

let kafkaProducer;
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

const checkTimeOverlap = (slots1, slots2) => {
  if (!slots1 || !slots2 || !Array.isArray(slots1) || !Array.isArray(slots2)) return false;
  const startToMinutes = (time) => parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);

  for (let s1 of slots1) {
    for (let s2 of slots2) {
      if (s1.dayOfWeek === s2.dayOfWeek) {
        const st1 = startToMinutes(s1.startTime), en1 = startToMinutes(s1.endTime);
        const st2 = startToMinutes(s2.startTime), en2 = startToMinutes(s2.endTime);
        if (st1 < en2 && en1 > st2) return true;
      }
    }
  }
  return false;
};

const calculateMatchScore = (u1, u2) => {
  let score = 0;
  const reasons = [];

  const sharedCourses = (u1.courses || []).filter(c => (u2.courses || []).includes(c));
  if (sharedCourses.length > 0) {
    score += 30;
    reasons.push(`Shared courses: ${sharedCourses.join(', ')}`);
  }

  const sharedTopics = (u1.topics || []).filter(t => (u2.topics || []).includes(t));
  if (sharedTopics.length > 0) {
    score += 20;
    reasons.push(`Shared topics: ${sharedTopics.join(', ')}`);
  }

  if (checkTimeOverlap(u1.availabilitySlots, u2.availabilitySlots)) {
    score += 20;
    reasons.push(`Overlapping free time`);
  }

  if (u1.studyMode && u2.studyMode && (u1.studyMode === u2.studyMode || u1.studyMode === 'BOTH' || u2.studyMode === 'BOTH')) {
    score += 15;
    reasons.push(`Compatible study mode`);
  }

  if (u1.studyPace && u2.studyPace && u1.studyPace === u2.studyPace) {
    score += 10;
    reasons.push(`Same study pace`);
  }

  if (u1.studyStyle && u2.studyStyle && u1.studyStyle === u2.studyStyle) {
    score += 5;
    reasons.push(`Similar study style`);
  }

  return { score: Math.min(100, Math.max(0, score)), reasons };
};

const runMatching = async (userId) => {
  const me = await prisma.userSnapshot.findUnique({ where: { userId } });
  if (!me) return;

  // Pagination logic to prevent loading all users
  const batchSize = 100;
  let cursor = null;
  let matches = [];

  while (true) {
    const fetchArgs = {
      take: batchSize,
      where: { userId: { not: userId } },
      orderBy: { id: 'asc' }
    };
    if (cursor) {
      fetchArgs.cursor = { id: cursor };
      fetchArgs.skip = 1;
    }

    const others = await prisma.userSnapshot.findMany(fetchArgs);
    if (others.length === 0) break;

    for (const other of others) {
      const { score, reasons } = calculateMatchScore(me, other);
      if (score > 40) {
        matches.push({ userId1: me.userId, userId2: other.userId, score, reasons });
      }
    }
    
    cursor = others[others.length - 1].id;
  }

  if (matches.length > 0) {
    matches.sort((a, b) => b.score - a.score);
    const topMatches = matches.slice(0, 10);

    // Filter existing matches to avoid duplicates or re-firing unnecessarily
    for (const m of topMatches) {
      const existing = await prisma.match.findFirst({
        where: {
          OR: [
            { userId1: m.userId1, userId2: m.userId2 },
            { userId1: m.userId2, userId2: m.userId1 }
          ]
        }
      });

      if (!existing || existing.score !== m.score) {
        if (existing) {
           await prisma.match.update({
             where: { id: existing.id },
             data: { score: m.score, reasons: m.reasons }
           });
        } else {
           await prisma.match.create({ data: m });
        }

        const msg = formatMessage(TOPICS.MATCH_FOUND, 'matching-service', { ...m });
        await kafkaProducer.send({
          topic: TOPICS.MATCH_FOUND,
          messages: [{ value: JSON.stringify(msg) }]
        });
      }
    }
  }
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'matching-service', timestamp: new Date().toISOString() });
});

app.get('/matches/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const matches = await prisma.match.findMany({
      where: {
        OR: [{ userId1: userId }, { userId2: userId }]
      },
      orderBy: { score: 'desc' },
      take: 10
    });

    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const startServer = async () => {
  try {
    kafkaProducer = createProducer('matching-service');
    // await kafkaProducer.connect();

    kafkaConsumer = createConsumer('matching-service-group');
    // await kafkaConsumer.connect();
    
    // await kafkaConsumer.subscribe({ topic: TOPICS.PREFERENCES_UPDATED, fromBeginning: true });
    // await kafkaConsumer.subscribe({ topic: TOPICS.AVAILABILITY_UPDATED, fromBeginning: true });
    
    /* 
    await kafkaConsumer.run({
      autoCommit: false,
      eachMessage: async ({ topic, partition, message, heartbeat, pause }) => {
        const msg = JSON.parse(message.value.toString());
        const { eventName, payload } = msg;

        try {
          if (eventName === TOPICS.PREFERENCES_UPDATED) {
            await prisma.userSnapshot.upsert({
              where: { userId: payload.userId },
              update: { courses: payload.courses, topics: payload.topics, studyPace: payload.studyPace, studyMode: payload.studyMode, groupSize: payload.groupSize, studyStyle: payload.studyStyle },
              create: { userId: payload.userId, courses: payload.courses, topics: payload.topics, studyPace: payload.studyPace, studyMode: payload.studyMode, groupSize: payload.groupSize, studyStyle: payload.studyStyle }
            });
            await runMatching(payload.userId);
          } else if (eventName === TOPICS.AVAILABILITY_UPDATED) {
            await prisma.userSnapshot.upsert({
              where: { userId: payload.userId },
              update: { availabilitySlots: payload.slots },
              create: { userId: payload.userId, availabilitySlots: payload.slots }
            });
            await runMatching(payload.userId);
          }
          
          await kafkaConsumer.commitOffsets([{ topic, partition, offset: (parseInt(message.offset) + 1).toString() }]);
        } catch (err) {
          console.error("Error processing message", err);
        }
      }
    });
    */

    app.listen(PORT, () => console.log(`Matching Service listening on port ${PORT}`));
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
