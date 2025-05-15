import { kafka } from '../../plugins/kafka.js';
import { KafkaTopicConsumer } from './consumers/kafka.topic.consumer.js';
import TournamentTopicConsumer from './consumers/tournament.topic.consumer.js';

export async function startConsumer() {
  const mainConsumer = kafka.consumer({ groupId: 'STATUS', sessionTimeout: 10000 });
  const consumers: KafkaTopicConsumer[] = [new TournamentTopicConsumer()];

  await mainConsumer.connect();

  for (const consumer of consumers) {
    await mainConsumer.subscribe({ topic: consumer.topic, fromBeginning: consumer.fromBeginning });
  }

  await mainConsumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.value) {
        return console.warn(`Null message received on topic ${topic}`);
      }

      const handler = consumers.find((h) => h.topic === topic);
      if (!handler) {
        return console.warn(`No handler found for topic ${topic}`);
      }

      try {
        await handler.handle(message.value.toString());
      } catch (error) {
        console.error(
          `❌ Error handling message from topic ${topic}:`,
          error,
          'Raw message:',
          message.value.toString(),
        );
      }
    },
  });
}
