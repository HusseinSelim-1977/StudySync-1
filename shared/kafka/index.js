const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'studysync-core',
    brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
    retry: {
        initialRetryTime: 300,
        retries: 5
    }
});

// ---------------- PRODUCER ----------------

const createProducer = () => {
    return kafka.producer({
        allowAutoTopicCreation: true
    });
};

// ---------------- CONSUMER ----------------

const createConsumer = (groupId) => {
    return kafka.consumer({ groupId });
};

// ---------------- TOPICS ----------------

const TOPICS = {
    // -------- REQUESTS (Gateway → Services) --------
    REGISTER_USER: 'REGISTER_USER',
    LOGIN_USER: 'LOGIN_USER',
    GET_USER: 'GET_USER',
    UPDATE_USER: 'UPDATE_USER',

    GET_PROFILE: 'GET_PROFILE',
    UPDATE_PROFILE: 'UPDATE_PROFILE',

    GET_AVAILABILITY: 'GET_AVAILABILITY',
    CREATE_AVAILABILITY: 'CREATE_AVAILABILITY',
    DELETE_AVAILABILITY: 'DELETE_AVAILABILITY',

    GET_MATCHES: 'GET_MATCHES',

    // -------- RESPONSES --------
    GATEWAY_RESPONSES: 'GATEWAY_RESPONSES',

    // -------- EVENTS (Service → Service) --------
    USER_REGISTERED: 'USER_REGISTERED',
    PREFERENCES_UPDATED: 'PREFERENCES_UPDATED',
    AVAILABILITY_UPDATED: 'AVAILABILITY_UPDATED',
    MATCH_FOUND: 'MATCH_FOUND',

    SESSION_CREATED: 'SESSION_CREATED',
    SESSION_JOINED: 'SESSION_JOINED',
    SESSION_CANCELLED: 'SESSION_CANCELLED',

    MESSAGE_SENT: 'MESSAGE_SENT',
    NOTIFICATION_CREATED: 'NOTIFICATION_CREATED'
};

// ---------------- MESSAGE FORMAT ----------------

const formatMessage = (eventName, producerService, payload, correlationId, replyTo) => {
    const crypto = require('crypto');

    return {
        eventName,
        timestamp: new Date().toISOString(),
        producerService,
        correlationId: correlationId || crypto.randomUUID(),
        replyTo: replyTo || null,
        payload
    };
};

module.exports = {
    createProducer,
    createConsumer,
    TOPICS,
    formatMessage
};