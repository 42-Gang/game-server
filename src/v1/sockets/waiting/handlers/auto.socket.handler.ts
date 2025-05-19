import { Socket } from 'socket.io';
import { autoJoinSchema, autoJoinSchemaType } from '../schemas/auto-game.schema.js';
import { tournamentRequestProducer } from '../../../kafka/producers/tournament.producer.js';
import WaitingQueueCache from '../../../storage/cache/waiting.queue.cache.js';
import { FastifyBaseLogger } from 'fastify';

export default class AutoSocketHandler {
  constructor(
    private readonly waitingQueueCache: WaitingQueueCache,
    private readonly logger: FastifyBaseLogger,
  ) {}

  async joinAutoRoom(socket: Socket, payload: autoJoinSchemaType) {
    autoJoinSchema.parse(payload);

    const { tournamentSize } = payload;

    this.logger.info(
      `User ${socket.data.userId} joined waiting room for tournament size ${tournamentSize}`,
    );

    // TODO: 이미 대기큐에 들어가 있는 유저는 대기큐에 들어가지 않도록 처리

    await this.waitingQueueCache.addUser(tournamentSize, socket.data.userId);
    if (await this.waitingQueueCache.isQueueReady(tournamentSize)) {
      const userIds = await this.waitingQueueCache.popUsersForMatch(tournamentSize);
      await tournamentRequestProducer({
        size: tournamentSize,
        mode: 'AUTO',
        players: userIds,
        timestamp: new Date().toISOString(),
      });
      this.logger.info(`Tournament request sent for size ${tournamentSize} with users: ${userIds}`);
    }
  }
}
