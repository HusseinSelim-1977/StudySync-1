require('dotenv').config({ path: '../../.env' });
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// We map out the shared module requiring Kafka Producer
const path = require('path');
const { createProducer, TOPICS, formatMessage } = require(path.resolve(__dirname, '../../../shared/kafka'));

const app = express();
app.use(express.json());
const prisma = new PrismaClient();

const PORT = process.env.USER_SERVICE_PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

let kafkaProducer;

// JWT Middleware
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
    res.json({ status: 'ok', service: 'user-service', timestamp: new Date().toISOString() });
});

app.post('/auth/register', async (req, res) => {
    try {
        const { email, password, name, university, academicYear, contactEmail, contactPhone } = req.body;
        if (!email || !password || !name) return res.status(400).json({ error: 'Email, password, and name are required' });

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(409).json({ error: 'Email already exists' });

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { email, passwordHash, name, university, academicYear, contactEmail, contactPhone }
        });

        // Publish Kafka Event
        try {
            const msg = formatMessage(TOPICS.USER_REGISTERED, 'user-service', { id: user.id, email: user.email, name: user.name });
            await kafkaProducer.send({
                topic: TOPICS.USER_REGISTERED,
                messages: [{ value: JSON.stringify(msg) }]
            });
        } catch (kafkaErr) {
            console.error('Failed to dispatch USER_REGISTERED event', kafkaErr);
        }

        const { passwordHash: _ph, ...safeUser } = user;
        res.status(201).json(safeUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, refreshToken, userId: user.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/users/:id', authenticateToken, async (req, res) => {
    try {
        if (req.params.id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

        const user = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (!user) return res.status(404).json({ error: 'Not found' });

        const { passwordHash: _ph, ...safeUser } = user;
        res.json(safeUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/users/:id', authenticateToken, async (req, res) => {
    try {
        if (req.params.id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

        const { name, university, academicYear, contactEmail, contactPhone } = req.body;
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { name, university, academicYear, contactEmail, contactPhone }
        });

        const { passwordHash: _ph, ...safeUser } = user;
        res.json(safeUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const startServer = async () => {
    try {
        kafkaProducer = createProducer('user-service');
        // In production we would await connection here. 
        await kafkaProducer.connect();

        app.listen(PORT, () => console.log(`User Service listening on port ${PORT}`));
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Graceful Shutdown
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
