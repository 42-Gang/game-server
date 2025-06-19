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
  InviteMessageType,
  inviteMessageSchema,
  RoomUpdateUserType,
  roomUpdateSchema,
} from '../schemas/custom-game.schema.js';
import { WAITING_SOCKET_EVENTS } from '../waiting.event.js';
import CustomRoomCache from '../../../storage/cache/custom.room.cache.js';
import SocketCache from '../../../storage/cache/socket.cache.js';
import { FastifyBaseLogger } from 'fastify';
import UserServiceClient from '../../../client/user.service.client.js';
import { tournamentRequestProducer } from '../../../kafka/producers/tournament.producer.js';
import { tournamentSizeType } from '../schemas/tournament.schema.js';

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
    socket.emit(WAITING_SOCKET_EVENTS.CUSTOM.CREATE, {
      roomId,
    });

    await this.broadcastRoomUpdate(roomId, socket);
    this.logger.info(
      `User ${socket.data.userId} created custom room with size ${message.tournamentSize}`,
    );
  }

  async inviteCustomRoom(socket: Socket, payload: customInviteType) {
    const message = customInviteSchema.parse(payload);

    if (!(await this.customRoomCache.isRoomHost(message.roomId, socket.data.userId))) {
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
      throw new Error('User is not connected');
    }

    const hostId = await this.customRoomCache.getHostId(message.roomId);
    const hostUser = await this.userServiceClient.getUserInfo(hostId);
    const response: InviteMessageType = {
      roomId: message.roomId,
      hostId: hostUser.id,
      hostName: hostUser.nickname,
      hostAvatarUrl: hostUser.avatarUrl,
    };
    inviteMessageSchema.parse(response);
    socket.to(socketId).emit(WAITING_SOCKET_EVENTS.CUSTOM.INVITE, response);
    this.logger.info(
      `${message.userId} user invited from ${message.roomId} custom room by ${socket.data.userId}`,
    );
  }

  async acceptCustomRoom(socket: Socket, payload: customAcceptType) {
    this.logger.info(`User ${socket.data.userId} is accepting custom room ${payload.roomId}`);
    const message = customAcceptSchema.parse(payload);

    await this.customRoomCache.addUserToRoom(message.roomId, socket.data.userId);

    const userIds = await this.customRoomCache.getUsersInRoom(message.roomId);
    const hostId = await this.customRoomCache.getHostId(message.roomId);
    const users = await this.createRoomUserDetails(userIds, hostId);

    const response = roomUpdateSchema.parse({
      roomId: message.roomId,
      users,
    });
    socket.to(`custom:${message.roomId}`).emit(WAITING_SOCKET_EVENTS.WAITING_ROOM_UPDATE, response);
    socket.join(`custom:${message.roomId}`);

    socket.emit(WAITING_SOCKET_EVENTS.WAITING_ROOM_UPDATE, response);
  }

  private async createRoomUserDetails(userIds: number[], hostId: number) {
    return Promise.all(
      userIds.map(async (userId) => {
        const user = await this.userServiceClient.getUserInfo(userId);

        return {
          id: user.id,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          isHost: user.id === hostId,
        };
      }),
    );
  }

  async startCustomRoom(socket: Socket, payload: customStartType) {
    const message = customStartSchema.parse(payload);

    if (!(await this.customRoomCache.isRoomHost(message.roomId, socket.data.userId))) {
      throw new Error('You are not the host of this room');
    }

    const userIds = await this.customRoomCache.getUsersInRoom(message.roomId);
    const roomInfo = await this.customRoomCache.getRoomInfo(message.roomId);
    await tournamentRequestProducer({
      size: roomInfo.maxPlayers as tournamentSizeType,
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
    socket.leave(`custom:${roomId}`);

    if (!(await this.customRoomCache.isRoomExists(roomId))) {
      return;
    }

    const userIds = await this.customRoomCache.getUsersInRoom(roomId);
    const hostId = await this.customRoomCache.getHostId(roomId);
    const users: RoomUpdateUserType[] = await this.createRoomUserDetails(userIds, hostId);

    const message = roomUpdateSchema.parse({
      roomId,
      users,
    });
    socket.to(`custom:${roomId}`).emit(WAITING_SOCKET_EVENTS.WAITING_ROOM_UPDATE, message);
  }

  async leaveCustomRoom(socket: Socket) {
    await this.leaveRoom(socket);
  }

  private async broadcastRoomUpdate(roomId: string, socket: Socket) {
    const userIds = await this.customRoomCache.getUsersInRoom(roomId);
    const hostId = await this.customRoomCache.getHostId(roomId);
    const users: RoomUpdateUserType[] = await this.createRoomUserDetails(userIds, hostId);

    const message = roomUpdateSchema.parse({
      roomId,
      users,
    });
    socket.emit(WAITING_SOCKET_EVENTS.WAITING_ROOM_UPDATE, message);
  }
}
