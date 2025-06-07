import { producer } from '../../../plugins/kafka.js';
import { TOPICS } from '../constants.js';
import { matchRequestMessageSchema } from '../schemas/match.topic.schema.js';

export async function matchRequestProducer(input: {
  tournameId: string;
  matchId: number;
  player1Id: number;
  player2Id: number;
}) {
  const message = matchRequestMessageSchema.parse({
    tournamentId: input.tournameId,
    matchId: input.matchId,
    player1Id: input.player1Id,
    player2Id: input.player2Id,
    timestamp: new Date().toISOString(),
  });

  await producer.send({
    topic: TOPICS.MATCH,
    messages: [
      {
        value: JSON.stringify(message),
      },
    ],
  });
}
