require('dotenv').config({ path: '../../.env' });
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const path = require('path');
const { createProducer, TOPICS, formatMessage } = require(path.resolve(__dirname, '../../../shared/kafka'));

const app = express();
app.use(express.json());
const prisma = new PrismaClient();

const PORT = process.env.MESSAGING_SERVICE_PORT || 4007;
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
  res.json({ status: 'ok', service: 'messaging-service', timestamp: new Date().toISOString() });
});

app.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    // Prisma array contains filtering
    const conversations = await prisma.conversation.findMany({
      where: {
        participantIds: {
          has: userId
        }
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/conversations', authenticateToken, async (req, res) => {
  try {
    let { targetUserId } = req.body;
    const userId = req.user.id;
    
    if (userId === targetUserId) return res.status(400).json({ error: 'Cannot converse with yourself' });

    // Check if conversation already exists
    const existing = await prisma.conversation.findFirst({
      where: {
        participantIds: {
          hasEvery: [userId, targetUserId]
        }
      }
    });

    if (existing) {
      return res.json(existing);
    }

    const conversation = await prisma.conversation.create({
      data: {
        participantIds: [userId, targetUserId]
      }
    });

    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await prisma.conversation.findUnique({ where: { id } });
    if (!conversation) return res.status(404).json({ error: 'Not found' });
    if (!conversation.participantIds.includes(userId)) return res.status(403).json({ error: 'Forbidden' });

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/messages', authenticateToken, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { conversationId, content, targetUserId } = req.body;
    
    let convId = conversationId;

    if (!convId && targetUserId) {
      const existing = await prisma.conversation.findFirst({
        where: { participantIds: { hasEvery: [senderId, targetUserId] } }
      });
      if (existing) {
        convId = existing.id;
      } else {
        const newConv = await prisma.conversation.create({ data: { participantIds: [senderId, targetUserId] } });
        convId = newConv.id;
      }
    }

    if (!convId) return res.status(400).json({ error: 'conversationId or targetUserId required' });

    const conversation = await prisma.conversation.findUnique({ where: { id: convId } });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    if (!conversation.participantIds.includes(senderId)) return res.status(403).json({ error: 'Forbidden' });

    const message = await prisma.message.create({
      data: { conversationId: convId, senderId, content }
    });

    // update conversation timestamp
    await prisma.conversation.update({
      where: { id: convId },
      data: { updatedAt: new Date() }
    });

    // publish event 
    try {
      const recipientId = conversation.participantIds.find(id => id !== senderId);
      const msg = formatMessage(TOPICS.MESSAGE_SENT, 'messaging-service', { message, recipientId });
      await kafkaProducer.send({
        topic: TOPICS.MESSAGE_SENT,
        messages: [{ value: JSON.stringify(msg) }]
      });
    } catch (err) {
      console.error('Failed to notify MESSAGE_SENT', err);
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const startServer = async () => {
  try {
    kafkaProducer = createProducer('messaging-service');
    await kafkaProducer.connect();
    app.listen(PORT, () => console.log(`Messaging Service listening on port ${PORT}`));
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
