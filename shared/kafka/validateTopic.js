const { TOPICS } = require('./index');

const VALID_TOPICS = new Set(Object.values(TOPICS));

const assertValidTopic = (topic) => {
  if (!VALID_TOPICS.has(topic)) {
    throw new Error(`Invalid Kafka topic used: ${topic}`);
  }
};

module.exports = { assertValidTopic };