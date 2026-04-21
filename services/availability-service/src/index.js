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

// ---------------- ENUM ----------------

const DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY'
];

// ---------------- HELPERS ----------------

const sendResponse = async (topic, correlationId, payload) => {
  await kafkaProducer.send({
    topic,
    messages: [{
      value: JSON.stringify({ correlationId, payload })
    }]
  });
};

const normalizeDay = (day) => {
  if (!day) return null;
  return day.toUpperCase();
};

const isValidTime = (t) => /^\d{2}:\d{2}$/.test(t);

const overlaps = (a, b) => {
  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  return (
    a.dayOfWeek === b.dayOfWeek &&
    toMin(a.startTime) < toMin(b.endTime) &&
    toMin(a.endTime) > toMin(b.startTime)
  );
};

// ---------------- START ----------------

const start = async () => {
  kafkaProducer = createProducer();
  kafkaConsumer = createConsumer('availability-service');

  await kafkaProducer.connect();
  await kafkaConsumer.connect();

  await kafkaConsumer.subscribe({ topic: TOPICS.GET_AVAILABILITY });
  await kafkaConsumer.subscribe({ topic: TOPICS.CREATE_AVAILABILITY });
  await kafkaConsumer.subscribe({ topic: TOPICS.DELETE_AVAILABILITY });

  await kafkaConsumer.run({
    eachMessage: async ({ message }) => {
      const { eventName, payload, correlationId, replyTo } =
        JSON.parse(message.value.toString());

      try {

        // ---------------- GET ----------------
        if (eventName === TOPICS.GET_AVAILABILITY) {
          const { userId } = payload;

          const slots = await prisma.availabilitySlot.findMany({
            where: { userId },
            orderBy: { dayOfWeek: 'asc' }
          });

          return sendResponse(replyTo, correlationId, {
            success: true,
            data: { slots }
          });
        }

        // ---------------- CREATE ----------------
        if (eventName === TOPICS.CREATE_AVAILABILITY) {
          let { userId, dayOfWeek, startTime, endTime } = payload;

          if (!userId || !dayOfWeek || !startTime || !endTime) {
            return sendResponse(replyTo, correlationId, {
              success: false,
              error: 'Missing required fields'
            });
          }

          dayOfWeek = normalizeDay(dayOfWeek);

          if (!DAYS.includes(dayOfWeek)) {
            return sendResponse(replyTo, correlationId, {
              success: false,
              error: 'Invalid dayOfWeek'
            });
          }

          if (!isValidTime(startTime) || !isValidTime(endTime)) {
            return sendResponse(replyTo, correlationId, {
              success: false,
              error: 'Invalid time format (HH:MM)'
            });
          }

          if (startTime >= endTime) {
            return sendResponse(replyTo, correlationId, {
              success: false,
              error: 'startTime must be before endTime'
            });
          }

          // check overlap
          const existing = await prisma.availabilitySlot.findMany({
            where: { userId }
          });

          const newSlot = { dayOfWeek, startTime, endTime };

          const hasOverlap = existing.some(s => overlaps(s, newSlot));

          if (hasOverlap) {
            return sendResponse(replyTo, correlationId, {
              success: false,
              error: 'Time slot overlaps with existing slot'
            });
          }

          let slot;

          try {
            slot = await prisma.availabilitySlot.create({
              data: { userId, dayOfWeek, startTime, endTime }
            });
          } catch (err) {
            // handle unique constraint
            if (err.code === 'P2002') {
              return sendResponse(replyTo, correlationId, {
                success: false,
                error: 'Duplicate time slot'
              });
            }
            throw err;
          }

          const allSlots = await prisma.availabilitySlot.findMany({
            where: { userId }
          });

          // 🔥 notify matching service
          await kafkaProducer.send({
            topic: TOPICS.AVAILABILITY_UPDATED,
            messages: [{
              value: JSON.stringify(
                formatMessage(
                  TOPICS.AVAILABILITY_UPDATED,
                  'availability-service',
                  { userId, slots: allSlots }
                )
              )
            }]
          });

          return sendResponse(replyTo, correlationId, {
            success: true,
            data: { slot }
          });
        }

        // ---------------- DELETE ----------------
        if (eventName === TOPICS.DELETE_AVAILABILITY) {
          const { id, userId } = payload;

          const slot = await prisma.availabilitySlot.findUnique({
            where: { id }
          });

          if (!slot || slot.userId !== userId) {
            return sendResponse(replyTo, correlationId, {
              success: false,
              error: 'Slot not found or unauthorized'
            });
          }

          await prisma.availabilitySlot.delete({
            where: { id }
          });

          const allSlots = await prisma.availabilitySlot.findMany({
            where: { userId }
          });

          await kafkaProducer.send({
            topic: TOPICS.AVAILABILITY_UPDATED,
            messages: [{
              value: JSON.stringify(
                formatMessage(
                  TOPICS.AVAILABILITY_UPDATED,
                  'availability-service',
                  { userId, slots: allSlots }
                )
              )
            }]
          });

          return sendResponse(replyTo, correlationId, {
            success: true,
            data: { success: true }
          });
        }

      } catch (err) {
        console.error('Availability error:', err);

        if (replyTo && correlationId) {
          return sendResponse(replyTo, correlationId, {
            success: false,
            error: err.message
          });
        }
      }
    }
  });

  console.log('✅ Availability Service Ready (Schema-aligned)');
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