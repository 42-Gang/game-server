import { producer } from '../../../plugins/kafka.js';
import { MATCH_EVENTS, TOPICS } from '../constants.js';
import { matchRequestMessageSchema } from '../schemas/match.topic.schema.js';

export async function matchRequestProducer(input: {
  tournamentId: number;
  matchId: number;
  matchServerName: string;
  player1Id: number;
  player2Id: number;
}) {
  const message = matchRequestMessageSchema.parse({
    tournamentId: input.tournamentId,
    matchId: input.matchId,
    matchServerName: input.matchServerName,
    player1Id: input.player1Id,
    player2Id: input.player2Id,
    timestamp: new Date().toISOString(),
  });

  await producer.send({
    topic: TOPICS.MATCH,
    messages: [
      {
        value: JSON.stringify({
          eventType: MATCH_EVENTS.REQUEST,
          ...message,
        }),
      },
    ],
  });
}
