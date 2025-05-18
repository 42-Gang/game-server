import { producer } from '../../../plugins/kafka.js';
import { TOPICS, TOURNAMENT_EVENTS } from '../constants.js';
import {
  tournamentModeType,
  tournamentSizeType,
} from '../../sockets/waiting/schemas/tournament.schema.js';

type tournamentRequestProducerParams = {
  mode: tournamentModeType;
  userIds: number[];
  tournamentSize: tournamentSizeType;
};

export async function tournamentRequestProducer({
  tournamentSize,
  mode,
  userIds,
}: tournamentRequestProducerParams) {
  const timestamp = new Date().toISOString();
  await producer.send({
    topic: TOPICS.TOURNAMENT,
    messages: [
      {
        value: JSON.stringify({
          eventType: TOURNAMENT_EVENTS.REQUEST,
          mode,
          size: tournamentSize,
          players: userIds,
          timestamp,
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
