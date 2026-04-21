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
  await kafkaProducer.send({
    topic,
    messages: [{
      value: JSON.stringify({ correlationId, payload })
    }]
  });
};

// ---------------- MATCHING LOGIC ----------------

const checkTimeOverlap = (slots1, slots2) => {
  if (!slots1 || !slots2) return false;

  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  for (let s1 of slots1) {
    for (let s2 of slots2) {
      if (s1.dayOfWeek === s2.dayOfWeek) {
        const st1 = toMin(s1.startTime), en1 = toMin(s1.endTime);
        const st2 = toMin(s2.startTime), en2 = toMin(s2.endTime);
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
  if (sharedCourses.length) {
    score += 30;
    reasons.push(`Shared courses: ${sharedCourses.join(', ')}`);
  }

  const sharedTopics = (u1.topics || []).filter(t => (u2.topics || []).includes(t));
  if (sharedTopics.length) {
    score += 20;
    reasons.push(`Shared topics: ${sharedTopics.join(', ')}`);
  }

  if (checkTimeOverlap(u1.availabilitySlots, u2.availabilitySlots)) {
    score += 20;
    reasons.push(`Overlapping free time`);
  }

  if (
    u1.studyMode &&
    u2.studyMode &&
    (u1.studyMode === u2.studyMode || u1.studyMode === 'BOTH' || u2.studyMode === 'BOTH')
  ) {
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

// ---------------- RUN MATCHING ----------------

const runMatching = async (userId) => {
  const me = await prisma.userSnapshot.findUnique({ where: { userId } });
  if (!me) return;

  const batchSize = 100;
  let cursor = null;
  let matches = [];

  while (true) {
    const query = {
      take: batchSize,
      where: { userId: { not: userId } },
      orderBy: { id: 'asc' }
    };

    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1;
    }

    const users = await prisma.userSnapshot.findMany(query);
    if (!users.length) break;

    for (const other of users) {
      const { score, reasons } = calculateMatchScore(me, other);

      if (score > 40) {
        matches.push({
          userId1: me.userId,
          userId2: other.userId,
          score,
          reasons
        });
      }
    }

    cursor = users[users.length - 1].id;
  }

  if (!matches.length) return;

  matches.sort((a, b) => b.score - a.score);
  const topMatches = matches.slice(0, 10);

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

      await kafkaProducer.send({
        topic: TOPICS.MATCH_FOUND,
        messages: [{
          value: JSON.stringify(
            formatMessage(TOPICS.MATCH_FOUND, 'matching-service', m)
          )
        }]
      });
    }
  }
};

// ---------------- START ----------------

const start = async () => {
  kafkaProducer = createProducer();
  kafkaConsumer = createConsumer('matching-service');

  await kafkaProducer.connect();
  await kafkaConsumer.connect();

  await kafkaConsumer.subscribe({ topic: TOPICS.PREFERENCES_UPDATED });
  await kafkaConsumer.subscribe({ topic: TOPICS.AVAILABILITY_UPDATED });
  await kafkaConsumer.subscribe({ topic: TOPICS.GET_MATCHES });

  await kafkaConsumer.run({
    eachMessage: async ({ message }) => {
      const { eventName, payload, correlationId, replyTo } =
        JSON.parse(message.value.toString());

      try {
        // -------- PROFILE UPDATE --------
        if (eventName === TOPICS.PREFERENCES_UPDATED) {
          await prisma.userSnapshot.upsert({
            where: { userId: payload.userId },
            update: {
              courses: payload.courses,
              topics: payload.topics,
              studyPace: payload.studyPace,
              studyMode: payload.studyMode,
              groupSize: payload.groupSize,
              studyStyle: payload.studyStyle
            },
            create: payload
          });

          await runMatching(payload.userId);
        }

        // -------- AVAILABILITY UPDATE --------
        if (eventName === TOPICS.AVAILABILITY_UPDATED) {
          await prisma.userSnapshot.upsert({
            where: { userId: payload.userId },
            update: { availabilitySlots: payload.slots },
            create: {
              userId: payload.userId,
              availabilitySlots: payload.slots
            }
          });

          await runMatching(payload.userId);
        }

        // -------- GET MATCHES --------
        if (eventName === TOPICS.GET_MATCHES) {
          const matches = await prisma.match.findMany({
            where: {
              OR: [
                { userId1: payload.userId },
                { userId2: payload.userId }
              ]
            },
            orderBy: { score: 'desc' },
            take: 10
          });

          return sendResponse(replyTo, correlationId, {
            success: true,
            data: { matches }
          });
        }

      } catch (err) {
        console.error('Matching error:', err);

        if (replyTo && correlationId) {
          return sendResponse(replyTo, correlationId, {
            success: false,
            error: err.message
          });
        }
      }
    }
  });

  console.log('✅ Matching Service Ready');
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