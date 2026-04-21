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

// ---------------- ENUMS ----------------

const STUDY_PACE = ['SLOW', 'MEDIUM', 'FAST'];
const STUDY_MODE = ['ONLINE', 'INPERSON', 'BOTH'];
const STUDY_STYLE = ['NOTES', 'LISTENING', 'DISCUSSING', 'QUIET', 'OTHER'];

// ---------------- HELPERS ----------------

const sendResponse = async (topic, correlationId, payload) => {
  await kafkaProducer.send({
    topic,
    messages: [{
      value: JSON.stringify({ correlationId, payload })
    }]
  });
};

const normalizeEnum = (value) => {
  if (!value) return null;
  return value.toUpperCase();
};

// ---------------- START ----------------

const start = async () => {
  kafkaProducer = createProducer();
  kafkaConsumer = createConsumer('profile-service');

  await kafkaProducer.connect();
  await kafkaConsumer.connect();

  await kafkaConsumer.subscribe({ topic: TOPICS.GET_PROFILE });
  await kafkaConsumer.subscribe({ topic: TOPICS.UPDATE_PROFILE });

  await kafkaConsumer.run({
    eachMessage: async ({ message }) => {
      const { eventName, payload, correlationId, replyTo } =
        JSON.parse(message.value.toString());

      try {

        // ---------------- GET PROFILE ----------------
        if (eventName === TOPICS.GET_PROFILE) {
          const { userId } = payload;

          const profile = await prisma.profile.findUnique({
            where: { userId }
          });

          if (!profile) {
            return sendResponse(replyTo, correlationId, {
              success: false,
              error: 'Profile not found'
            });
          }

          return sendResponse(replyTo, correlationId, {
            success: true,
            data: { profile }
          });
        }

        // ---------------- UPDATE PROFILE ----------------
        if (eventName === TOPICS.UPDATE_PROFILE) {
          let {
            userId,
            courses,
            topics,
            studyPace,
            studyMode,
            groupSize,
            studyStyle
          } = payload;

          if (!userId) {
            return sendResponse(replyTo, correlationId, {
              success: false,
              error: 'userId is required'
            });
          }

          // normalize enums
          studyPace = normalizeEnum(studyPace);
          studyMode = normalizeEnum(studyMode);
          studyStyle = normalizeEnum(studyStyle);

          // validate enums
          if (studyPace && !STUDY_PACE.includes(studyPace)) {
            return sendResponse(replyTo, correlationId, {
              success: false,
              error: 'Invalid studyPace'
            });
          }

          if (studyMode && !STUDY_MODE.includes(studyMode)) {
            return sendResponse(replyTo, correlationId, {
              success: false,
              error: 'Invalid studyMode'
            });
          }

          if (studyStyle && !STUDY_STYLE.includes(studyStyle)) {
            return sendResponse(replyTo, correlationId, {
              success: false,
              error: 'Invalid studyStyle'
            });
          }

          const profile = await prisma.profile.upsert({
            where: { userId },
            update: {
              ...(courses !== undefined && { courses }),
              ...(topics !== undefined && { topics }),
              ...(studyPace !== null && { studyPace }),
              ...(studyMode !== null && { studyMode }),
              ...(groupSize !== undefined && { groupSize }),
              ...(studyStyle !== null && { studyStyle })
            },
            create: {
              userId,
              courses: courses || [],
              topics: topics || [],
              studyPace,
              studyMode,
              groupSize,
              studyStyle
            }
          });

          // 🔥 emit to matching service
          await kafkaProducer.send({
            topic: TOPICS.PREFERENCES_UPDATED,
            messages: [{
              value: JSON.stringify(
                formatMessage(
                  TOPICS.PREFERENCES_UPDATED,
                  'profile-service',
                  {
                    userId: profile.userId,
                    courses: profile.courses,
                    topics: profile.topics,
                    studyPace: profile.studyPace,
                    studyMode: profile.studyMode,
                    groupSize: profile.groupSize,
                    studyStyle: profile.studyStyle
                  }
                )
              )
            }]
          });

          return sendResponse(replyTo, correlationId, {
            success: true,
            data: { profile }
          });
        }

      } catch (err) {
        console.error('Profile service error:', err);

        if (replyTo && correlationId) {
          return sendResponse(replyTo, correlationId, {
            success: false,
            error: err.message
          });
        }
      }
    }
  });

  console.log('✅ Profile Service Ready');
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