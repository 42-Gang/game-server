import { Kafka } from 'kafkajs';
import * as process from 'node:process';

export const kafka = new Kafka({
  brokers: process.env.KAFKA_BROKER.split(','),
  ssl: false,
});
export const producer = kafka.producer();

(async () => {
  try {
    await producer.connect();
    console.log('Kafka producer connected successfully.');
  } catch (error) {
    console.error('Failed to connect Kafka producer:', error);
    process.exit(1); // Exit the process if the producer fails to connect
  }
})();
