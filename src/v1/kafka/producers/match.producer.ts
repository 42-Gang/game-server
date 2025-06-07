import { producer } from '../../../plugins/kafka.js';
import { TOPICS } from '../constants.js';
import { matchRequestMessageSchema } from '../schemas/match.topic.schema.js';

export async function matchRequestProducer(matchId: number, player1Id: number, player2Id: number) {
  const message = matchRequestMessageSchema.parse({
    matchId,
    player1Id,
    player2Id,
  });

  await producer.send({
    topic: TOPICS.MATCH,
    messages: [message],
  });
}
