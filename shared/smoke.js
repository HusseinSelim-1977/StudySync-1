const { createProducer, createConsumer, TOPICS } = require('./kafka/index');

function runSmokeTest() {
  try {
    const producer = createProducer('smoke-producer');
    const consumer = createConsumer('smoke-group');
    
    if (!producer) throw new Error("Producer failed to initialize");
    if (!consumer) throw new Error("Consumer failed to initialize");
    if (Object.keys(TOPICS).length === 0) throw new Error("TOPICS are empty");
    
    console.log("Smoke Test Passed: Kafka instances initialized successfully.");
  } catch (error) {
    console.error("Smoke Test Failed:", error.message);
    process.exit(1);
  }
}

runSmokeTest();
