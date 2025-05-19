import { autoJoinSchema, autoJoinSchemaType } from './schemas/auto-game.schema.js';
import { Socket } from 'socket.io';
import WaitingQueueCache from '../../storage/cache/waiting.queue.cache.js';
import { FastifyBaseLogger } from 'fastify';
import { tournamentRequestProducer } from '../../kafka/producers/tournament.producer.js';
import CustomRoomCache from '../../storage/cache/custom.room.cache.js';
import {
  customAcceptSchema,
  customAcceptType,
  customCreateSchema,
  customCreateType,
  customInviteSchema,
  customInviteType,
  customRoomInformationType,
} from './schemas/custom-game.schema.js';
import SocketCache from '../../storage/cache/socket.cache.js';
import { SOCKET_EVENTS } from './waiting.event.js';
import UserServiceClient from '../../client/user.service.client.js';

export default class WaitingSocketHandler {
  constructor(
    private readonly waitingQueueCache: WaitingQueueCache,
    private readonly customRoomCache: CustomRoomCache,
    private readonly socketCache: SocketCache,
    private readonly logger: FastifyBaseLogger,
    private readonly userServiceClient: UserServiceClient,
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

    const roomId = await this.customRoomCache.createRoom({
      hostId: socket.data.userId,
      maxPlayers: message.tournamentSize,
    });
    await socket.join(`custom:${roomId}`);
    socket.emit(SOCKET_EVENTS.CUSTOM.CREATE, {
      roomId,
    });
    this.logger.info(
      `User ${socket.data.userId} created custom room with size ${message.tournamentSize}`,
    );
  }

  async inviteCustomRoom(socket: Socket, payload: customInviteType) {
    const message = customInviteSchema.parse(payload);

    if (!(await this.customRoomCache.isUserHost(message.roomId, socket.data.userId))) {
      throw new Error('You are not the host of this room');
    }
    if ((await this.customRoomCache.getUsersInRoom(message.roomId)).includes(payload.userId)) {
      throw new Error('User is already in the room');
    }

    await this.customRoomCache.addInvitedUserToRoom(message.roomId, message.userId);
    const socketId = await this.socketCache.getSocketId({
      namespace: 'waiting',
      userId: message.userId,
    });
    if (!socketId) {
      this.logger.error(`User ${message.userId} is not connected`);
      return;
    }
    socket.to(socketId).emit(SOCKET_EVENTS.CUSTOM.INVITE, {
      roomId: message.roomId,
      hostId: socket.data.userId,
    });
    this.logger.info(
      `${message.userId} user invited from ${message.roomId} custom room by ${socket.data.userId}`,
    );
  }

  async leaveRoom(socket: Socket) {
    this.logger.info(`User ${socket.data.userId} left waiting room`);
    for (const tournamentSize of [2, 4, 8, 16]) {
      this.waitingQueueCache.removeUser(tournamentSize, socket.data.userId);
    }
    this.customRoomCache.disconnectedUser(socket.data.userId);
  }

  async acceptCustomRoom(socket: Socket, payload: customAcceptType) {
    const message = customAcceptSchema.parse(payload);

    await this.customRoomCache.addUserToRoom(message.roomId, socket.data.userId);
    const userIds = await this.customRoomCache.getUsersInRoom(message.roomId);
    const users = await Promise.all(
      userIds.map((userId) => this.userServiceClient.getUserInfo(userId)),
    );

    socket.to(`custom:${message.roomId}`).emit(SOCKET_EVENTS.WAITING_ROOM_UPDATE, {
      roomId: message.roomId,
      users,
    });
    socket.join(`custom:${message.roomId}`);
    socket.emit(SOCKET_EVENTS.WAITING_ROOM_UPDATE, {
      roomId: message.roomId,
      users,
    });
  }

  private broadcastToRoom(socket: Socket, roomId: string, data: customRoomInformationType) {
    socket.to(`custom:${roomId}`).emit(SOCKET_EVENTS.WAITING_ROOM_UPDATE, data);
  }
}
