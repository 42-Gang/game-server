import { Namespace, Socket } from 'socket.io';
import {
  autoJoinSchema,
  autoJoinSchemaType,
  autoLeaveSchema,
  autoLeaveSchemaType,
} from '../schemas/auto-game.schema.js';
import { tournamentRequestProducer } from '../../../kafka/producers/tournament.producer.js';
import WaitingQueueCache from '../../../storage/cache/waiting.queue.cache.js';
import { FastifyBaseLogger } from 'fastify';
import { roomUpdateSchema } from '../schemas/custom-game.schema.js';
import { WAITING_SOCKET_EVENTS } from '../waiting.event.js';
import UserServiceClient from '../../../client/user.service.client.js';
import { tournamentSizeSchema } from '../schemas/tournament.schema.js';
import SocketCache from '../../../storage/cache/socket.cache.js';

export default class AutoSocketHandler {
  constructor(
    private readonly waitingQueueCache: WaitingQueueCache,
    private readonly logger: FastifyBaseLogger,
    private readonly userServiceClient: UserServiceClient,
    private readonly socketCache: SocketCache,
    private readonly waitingNamespace: Namespace,
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
      return;
    }
    await this.sendWaitingRoomUpdates(tournamentSize);
  }

  async leaveAutoRoom(socket: Socket, payload: autoLeaveSchemaType) {
    autoLeaveSchema.parse(payload);

    const { tournamentSize } = payload;
    const userId = socket.data.userId;

    if (!(await this.waitingQueueCache.isUserInQueue(tournamentSize, userId))) {
      this.logger.info(`User ${userId} is not in the waiting queue for size ${tournamentSize}`);
      return;
    }

    await this.waitingQueueCache.removeUser(tournamentSize, userId);
    this.logger.info(
      `User ${userId} has been removed from the waiting queue for size ${tournamentSize}`,
    );

    socket.emit(WAITING_SOCKET_EVENTS.LEAVE_SUCCESS, {
      message: `Successfully left the queue for ${tournamentSize} tournament`,
    });

    await this.sendWaitingRoomUpdates(tournamentSize);
  }

  async leaveAllAutoRooms(socket: Socket) {
    const leavePromises = tournamentSizeSchema.options.map((tournamentSize) =>
      this.leaveAutoRoom(socket, {
        tournamentSize: tournamentSize.value,
      }),
    );

    await Promise.all(leavePromises);
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

  private async sendWaitingRoomUpdates(tournamentSize: number) {
    const userIds = await this.waitingQueueCache.getUsersInQueue(tournamentSize);
    if (userIds.length === 0) {
      return;
    }

    const userInfoPromises = userIds.map((userId) => this.userServiceClient.getUserInfo(userId));
    const users = await Promise.all(userInfoPromises);

    await Promise.all(
      users.map(async (currentUser) => {
        const maskedUsers = users.map((user) => {
          if (currentUser.id !== user.id) {
            return {
              id: 0,
              nickname: '???',
              avatarUrl: 'https://null.com/null.png',
            };
          }
          return user;
        });
        const response = roomUpdateSchema.parse({
          users: maskedUsers,
        });
        const socket = await this.findSocketByUserId(currentUser.id);
        socket.emit(WAITING_SOCKET_EVENTS.WAITING_ROOM_UPDATE, response);
      }),
    );
  }

  private async findSocketByUserId(userId: number): Promise<Socket> {
    const socketId = await this.socketCache.getSocketId({
      namespace: 'waiting',
      userId: userId,
    });

    if (!socketId) {
      this.logger.error(`Socket ID not found for user ${userId}`);
      throw new Error(`Socket ID not found for user ${userId}`);
    }

    const socket = this.waitingNamespace.sockets.get(socketId);
    if (!socket) {
      this.logger.error(`Socket not found for user ${userId} with ID ${socketId}`);
      throw new Error(`Socket not found for user ${userId}`);
    }

    return socket;
  }
}
