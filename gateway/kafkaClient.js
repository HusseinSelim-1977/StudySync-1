const path = require('path');
const {
  createProducer,
  createConsumer,
  TOPICS
} = require(path.resolve(__dirname, '../shared/kafka'));

const producer = createProducer();
const consumer = createConsumer('gateway-group');

const pendingRequests = new Map();

const REQUEST_TIMEOUT = 5000;

const initKafka = async () => {
  await producer.connect();
  await consumer.connect();

  await consumer.subscribe({ topic: TOPICS.GATEWAY_RESPONSES });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const msg = JSON.parse(message.value.toString());
        const { correlationId, payload } = msg;

        if (pendingRequests.has(correlationId)) {
          pendingRequests.get(correlationId)(payload);
          pendingRequests.delete(correlationId);
        }
      } catch (err) {
        console.error('Invalid Kafka response:', err.message);
      }
    }
  });
};

const request = async (topic, payload) => {
  const correlationId = `${Date.now()}-${Math.random()}`;

  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(correlationId);
      reject(new Error(`Timeout waiting for ${topic}`));
    }, REQUEST_TIMEOUT);

    pendingRequests.set(correlationId, (response) => {
      clearTimeout(timeout);
      resolve(response);
    });

    try {
      await producer.send({
        topic,
        messages: [{
          value: JSON.stringify({
            eventName: topic,
            correlationId,
            replyTo: TOPICS.GATEWAY_RESPONSES,
            payload
          })
        }]
      });
    } catch (err) {
      pendingRequests.delete(correlationId);
      clearTimeout(timeout);
      reject(err);
    }
  });
};

module.exports = { initKafka, request };