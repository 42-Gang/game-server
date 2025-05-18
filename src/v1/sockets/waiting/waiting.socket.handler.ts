import { customJoinSchemaType } from './schemas/custom-join.schema.js';
import { Socket } from 'socket.io';
import WaitingQueueCache from '../../storage/cache/waiting.queue.cache.js';
import { FastifyBaseLogger } from 'fastify';
import { tournamentRequestProducer } from '../../kafka/producers/tournament.producer.js';

export default class WaitingSocketHandler {
  constructor(
    private readonly waitingQueueCache: WaitingQueueCache,
    private readonly logger: FastifyBaseLogger,
  ) {}

  async joinRoom(socket: Socket, { tournamentSize }: customJoinSchemaType) {
    this.logger.info(
      `User ${socket.data.userId} joined waiting room for tournament size ${tournamentSize}`,
    );

    await this.waitingQueueCache.enqueueUser(tournamentSize, socket.data.userId);
    if (await this.waitingQueueCache.isQueueReady(tournamentSize)) {
      const userIds = await this.waitingQueueCache.dequeueUsersForMatch(tournamentSize);
      await tournamentRequestProducer({
        tournamentSize,
        mode: 'AUTO',
        userIds,
      });
      this.logger.info(`Tournament request sent for size ${tournamentSize} with users: ${userIds}`);
    }
  }
}
