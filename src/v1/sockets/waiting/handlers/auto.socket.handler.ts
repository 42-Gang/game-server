import { Socket } from 'socket.io';
import { autoJoinSchema, autoJoinSchemaType } from '../schemas/auto-game.schema.js';
import { tournamentRequestProducer } from '../../../kafka/producers/tournament.producer.js';
import WaitingQueueCache from '../../../storage/cache/waiting.queue.cache.js';
import { FastifyBaseLogger } from 'fastify';
import { roomUpdateSchema } from '../schemas/custom-game.schema.js';
import { WAITING_SOCKET_EVENTS } from '../waiting.event.js';
import UserServiceClient from '../../../client/user.service.client.js';

export default class AutoSocketHandler {
  constructor(
    private readonly waitingQueueCache: WaitingQueueCache,
    private readonly logger: FastifyBaseLogger,
    private readonly userServiceClient: UserServiceClient,
  ) {}

  async joinAutoRoom(socket: Socket, payload: autoJoinSchemaType) {
    autoJoinSchema.parse(payload);

    const { tournamentSize } = payload;

    this.logger.info(
      `User ${socket.data.userId} joined waiting room for tournament size ${tournamentSize}`,
    );

    if (await this.waitingQueueCache.isUserInQueue(tournamentSize, socket.data.userId)) {
      this.logger.info(
        `User ${socket.data.userId} is already in the waiting queue for size ${tournamentSize}`,
      );
      throw new Error(`User is already in the waiting queue for size ${tournamentSize}`);
    }

    await this.waitingQueueCache.addUser(tournamentSize, socket.data.userId);
    if (await this.waitingQueueCache.isQueueReady(tournamentSize)) {
      await this.startTournament(tournamentSize);
    }

    const user = await this.userServiceClient.getUserInfo(socket.data.userId);

    const response = roomUpdateSchema.parse({
      roomId: '',
      users: [
        {
          id: user.id,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          isHost: false,
        },
      ],
    });
    socket.emit(WAITING_SOCKET_EVENTS.WAITING_ROOM_UPDATE, response);
  }

  private async startTournament(tournamentSize: 2 | 4 | 8 | 16) {
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
