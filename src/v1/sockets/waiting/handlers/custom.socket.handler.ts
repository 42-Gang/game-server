// src/v1/sockets/waiting/handlers/custom.handler.ts
import { Socket } from 'socket.io';
import {
  customCreateSchema,
  customCreateType,
  customInviteSchema,
  customInviteType,
  customAcceptSchema,
  customAcceptType,
  customStartType,
  customStartSchema,
} from '../schemas/custom-game.schema.js';
import { SOCKET_EVENTS } from '../waiting.event.js';
import CustomRoomCache from '../../../storage/cache/custom.room.cache.js';
import SocketCache from '../../../storage/cache/socket.cache.js';
import { FastifyBaseLogger } from 'fastify';
import UserServiceClient from '../../../client/user.service.client.js';
import { tournamentRequestProducer } from '../../../kafka/producers/tournament.producer.js';

export default class CustomSocketHandler {
  constructor(
    private readonly customRoomCache: CustomRoomCache,
    private readonly socketCache: SocketCache,
    private readonly logger: FastifyBaseLogger,
    private readonly userServiceClient: UserServiceClient,
  ) {}

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
      users,
    });
  }

  async startCustomRoom(socket: Socket, payload: customStartType) {
    const message = customStartSchema.parse(payload);

    if (!(await this.customRoomCache.isRoomHost(message.roomId, socket.data.userId))) {
      throw new Error('You are not the host of this room');
    }

    const userIds = await this.customRoomCache.getUsersInRoom(message.roomId);
    await tournamentRequestProducer({
      size: message.tournamentSize,
      mode: 'CUSTOM',
      players: userIds,
      timestamp: new Date().toISOString(),
    });
  }

  async leaveRoom(socket: Socket) {
    const roomId = await this.customRoomCache.getRoomIdByUserId(socket.data.userId);

    if (!roomId) {
      this.logger.error(`User ${socket.data.userId} is not in any custom room`);
      return;
    }

    await this.customRoomCache.removeUserFromRoom(roomId, socket.data.userId);
    const userIds = await this.customRoomCache.getUsersInRoom(roomId);
    const users = await Promise.all(
      userIds.map((userId) => this.userServiceClient.getUserInfo(userId)),
    );
    socket.leave(`custom:${roomId}`);
    socket.to(`custom:${roomId}`).emit(SOCKET_EVENTS.WAITING_ROOM_UPDATE, {
      roomId,
      users,
    });
  }
}
