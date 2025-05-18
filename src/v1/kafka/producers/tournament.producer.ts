import { producer } from '../../../plugins/kafka.js';
import { TOPICS, TOURNAMENT_EVENTS } from '../constants.js';
import { tournamentSizeType } from '../../sockets/waiting/schemas/tournament.schema.js';
import { requestTournamentMessageType } from '../schemas/tournament.topic.schema.js';

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

type tournamentCreatedProducerParams = {
  tournamentSize: tournamentSizeType;
  userIds: number[];
};

export async function tournamentCreatedProducer({
  tournamentSize,
  userIds,
}: tournamentCreatedProducerParams) {
  const timestamp = new Date().toISOString();
  await producer.send({
    topic: TOPICS.TOURNAMENT,
    messages: [
      {
        key: String(tournamentSize),
        value: JSON.stringify({
          eventType: TOURNAMENT_EVENTS.CREATED,
          tournamentSize,
          userIds,
          timestamp,
        }),
      },
    ],
  });
}
