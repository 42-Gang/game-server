import { kafka } from '../../plugins/kafka.js';
import { KafkaTopicConsumer } from './consumers/kafka.topic.consumer.js';
import TournamentTopicConsumer from './consumers/tournament.topic.consumer.js';
import { FastifyBaseLogger } from 'fastify';

export async function startConsumer(
  tournamentTopicConsumer: TournamentTopicConsumer,
  logger: FastifyBaseLogger,
) {
  const mainConsumer = kafka.consumer({ groupId: 'MAIN_GAME_SERVER', sessionTimeout: 10000 });
  const topicConsumers: KafkaTopicConsumer[] = [tournamentTopicConsumer];

  await mainConsumer.connect();

  for (const topicConsumer of topicConsumers) {
    await mainConsumer.subscribe({
      topic: topicConsumer.topic,
      fromBeginning: topicConsumer.fromBeginning,
    });
  }

  await mainConsumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.value) {
        return console.warn(`Null message received on topic ${topic}`);
      }

      const handler = topicConsumers.find((h) => h.topic === topic);
      if (!handler) {
        return console.warn(`No handler found for topic ${topic}`);
      }

      try {
        await handler.handle(message.value.toString());
      } catch (error) {
        logger.error(error, `❌ Error handling message from topic ${topic}:`);
        logger.error(message.value.toString(), 'Raw message:');
      }
    },
  });
}
