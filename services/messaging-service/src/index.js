require('dotenv').config();

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const path = require('path');

const {
  createProducer,
  TOPICS,
  formatMessage
} = require(path.resolve(__dirname, '../../../shared/kafka'));

const app = express();
app.use(express.json());

const prisma = new PrismaClient();

const PORT = process.env.MESSAGING_SERVICE_PORT || 4007;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

let kafkaProducer;

// ---------------- AUTH ----------------

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });

    req.user = user;
    next();
  });
};

// ---------------- ROUTES ----------------

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'messaging-service' });
});

// -------- GET CONVERSATIONS --------
app.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await prisma.conversation.findMany({
      where: {
        participantIds: { has: userId }
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------- CREATE CONVERSATION --------
app.post('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId || userId === targetUserId) {
      return res.status(400).json({ error: 'Invalid target user' });
    }

    const existing = await prisma.conversation.findFirst({
      where: {
        participantIds: {
          hasEvery: [userId, targetUserId]
        }
      }
    });

    if (existing) return res.json(existing);

    const conversation = await prisma.conversation.create({
      data: {
        participantIds: [userId, targetUserId]
      }
    });

    res.status(201).json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------- GET MESSAGES --------
app.get('/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id }
    });

    if (!conversation)
      return res.status(404).json({ error: 'Conversation not found' });

    if (!conversation.participantIds.includes(userId))
      return res.status(403).json({ error: 'Forbidden' });

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------- SEND MESSAGE --------
app.post('/messages', authenticateToken, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { conversationId, content, targetUserId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content required' });
    }

    let convId = conversationId;

    // auto-create conversation if needed
    if (!convId && targetUserId) {
      if (senderId === targetUserId) {
        return res.status(400).json({ error: 'Cannot message yourself' });
      }

      const existing = await prisma.conversation.findFirst({
        where: {
          participantIds: { hasEvery: [senderId, targetUserId] }
        }
      });

      if (existing) {
        convId = existing.id;
      } else {
        const newConv = await prisma.conversation.create({
          data: {
            participantIds: [senderId, targetUserId]
          }
        });
        convId = newConv.id;
      }
    }

    if (!convId) {
      return res.status(400).json({
        error: 'conversationId or targetUserId required'
      });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: convId }
    });

    if (!conversation)
      return res.status(404).json({ error: 'Conversation not found' });

    if (!conversation.participantIds.includes(senderId))
      return res.status(403).json({ error: 'Forbidden' });

    const message = await prisma.message.create({
      data: {
        conversationId: convId,
        senderId,
        content
      }
    });

    await prisma.conversation.update({
      where: { id: convId },
      data: { updatedAt: new Date() }
    });

    // 🔥 notify via Kafka
    try {
      const recipientId = conversation.participantIds.find(
        id => id !== senderId
      );

      if (recipientId) {
        await kafkaProducer.send({
          topic: TOPICS.MESSAGE_SENT,
          messages: [{
            value: JSON.stringify(
              formatMessage(TOPICS.MESSAGE_SENT, 'messaging-service', {
                message,
                recipientId
              })
            )
          }]
        });
      }
    } catch (err) {
      console.error('Kafka MESSAGE_SENT failed:', err);
    }

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- START ----------------

const startServer = async () => {
  try {
    kafkaProducer = createProducer();
    await kafkaProducer.connect();

    app.listen(PORT, () => {
      console.log(`✅ Messaging Service running on ${PORT}`);
    });
  } catch (err) {
    console.error('Messaging service failed:', err);
    process.exit(1);
  }
};

startServer();

// graceful shutdown
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