import { producer } from '../../../plugins/kafka.js';
import { TOPICS, TOURNAMENT_EVENTS } from '../constants.js';

type tournamentRequestProducerParams = {
  tournamentSize: number;
  userIds: number[];
};

export async function tournamentRequestProducer({
  tournamentSize,
  userIds,
}: tournamentRequestProducerParams) {
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

type tournamentCreatedProducerParams = {
  tournamentSize: number;
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
