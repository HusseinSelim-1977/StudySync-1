// shared/kafka/index.js

require('dotenv').config();
const { Kafka, Partitioners } = require('kafkajs');

// ---------------- KAFKA INSTANCE ----------------

const kafka = new Kafka({
  clientId: 'studysync-core',
  brokers: [process.env.KAFKA_BROKERS || 'kafka:9092'],
});

// ---------------- PRODUCER ----------------

const createProducer = () =>
  kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner, // avoids warning
  });

// ---------------- CONSUMER ----------------

const createConsumer = (groupId) =>
  kafka.consumer({ groupId });

// ---------------- TOPICS ----------------

const TOPICS = {
  // -------- USER --------
  REGISTER_USER: 'register-user',
  LOGIN_USER: 'login-user',
  GET_USER: 'get-user',

  // -------- PROFILE --------
  GET_PROFILE: 'get-profile',

  // -------- AVAILABILITY --------
  GET_AVAILABILITY: 'get-availability',

  // -------- MATCHING --------
  GET_MATCHES: 'get-matches',

  // -------- SESSION --------
  CREATE_SESSION: 'create-session',
  GET_SESSIONS: 'get-sessions',
  GET_SESSION: 'get-session',
  JOIN_SESSION: 'join-session',
  LEAVE_SESSION: 'leave-session',

  // -------- SESSION EVENTS --------
  SESSION_CREATED: 'session-created',
  SESSION_JOINED: 'session-joined',
  SESSION_CANCELLED: 'session-cancelled',

  // -------- NOTIFICATIONS --------
  SEND_NOTIFICATION: 'send-notification',
};

// ---------------- MESSAGE FORMAT ----------------

const formatMessage = (eventName, source, payload) => ({
  eventName,
  source,
  payload,
  timestamp: new Date().toISOString(),
});

// ---------------- EXPORTS ----------------

module.exports = {
  createProducer,
  createConsumer,
  TOPICS,
  formatMessage,
};