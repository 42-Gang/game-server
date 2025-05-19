import { autoJoinSchema, autoJoinSchemaType } from './schemas/auto-game.schema.js';
import { Socket } from 'socket.io';
import WaitingQueueCache from '../../storage/cache/waiting.queue.cache.js';
import { FastifyBaseLogger } from 'fastify';
import { tournamentRequestProducer } from '../../kafka/producers/tournament.producer.js';
import CustomRoomCache from '../../storage/cache/custom.room.cache.js';
import { customCreateSchema, customCreateType } from './schemas/custom-game.schema.js';

export default class WaitingSocketHandler {
  constructor(
    private readonly waitingQueueCache: WaitingQueueCache,
    private readonly customRoomCache: CustomRoomCache,
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

  async createCustomRoom(socket: Socket, payload: customCreateType) {
    const message = customCreateSchema.parse(payload);

    await this.customRoomCache.createRoom({
      hostId: socket.data.userId,
      maxPlayers: message.tournamentSize,
    });
    this.logger.info(
      `User ${socket.data.userId} created custom room with size ${message.tournamentSize}`,
    );
  }

  leaveRoom(socket: Socket) {
    this.logger.info(`User ${socket.data.userId} left waiting room`);
    for (const tournamentSize of [2, 4, 8, 16]) {
      this.waitingQueueCache.removeUser(tournamentSize, socket.data.userId);
    }
  }
}
