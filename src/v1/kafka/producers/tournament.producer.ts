import { producer } from '../../../plugins/kafka.js';
import { TOPICS, TOURNAMENT_EVENTS } from '../constants.js';
import {
  createdTournamentMessageType,
  requestTournamentMessageType,
} from '../schemas/tournament.topic.schema.js';

export async function tournamentRequestProducer(input: requestTournamentMessageType) {
  await producer.send({
    topic: TOPICS.TOURNAMENT,
    messages: [
      {
        value: JSON.stringify({
          eventType: TOURNAMENT_EVENTS.REQUEST,
          mode: input.mode,
          size: input.size,
          players: input.players,
          timestamp: input.timestamp,
        }),
      },
    ],
  });
}

export async function tournamentCreatedProducer(input: createdTournamentMessageType) {
  await producer.send({
    topic: TOPICS.TOURNAMENT,
    messages: [
      {
        value: JSON.stringify({
          eventType: TOURNAMENT_EVENTS.CREATED,
          mode: input.mode,
          size: input.size,
          players: input.players,
          tournamentId: input.tournamentId,
          timestamp: input.timestamp,
        }),
      },
    ],
  });
}
