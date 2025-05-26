import { Redis } from 'ioredis';
import { FastifyBaseLogger } from 'fastify';
import { v4 as uuid } from 'uuid';

interface RoomInfo {
  hostId: number;
  maxPlayers: number;
}

export default class CustomRoomCache {
  private readonly CUSTOM_USERS = 'custom:users';
  private readonly ttl = 60 * 10;

  constructor(
    private readonly redisClient: Redis,
    private readonly logger: FastifyBaseLogger,
  ) {}

  private getRoomKey(roomId: string): string {
    return `custom-room:${roomId}`;
  }

  private getUsersKey(roomId: string): string {
    return `${this.getRoomKey(roomId)}:users`;
  }

  private getOrderedUsersKey(roomId: string): string {
    return `${this.getRoomKey(roomId)}:users:ordered`;
  }

  private getStatusKey(roomId: string): string {
    return `${this.getRoomKey(roomId)}:status`;
  }

  private getInvitedKey(roomId: string): string {
    return `${this.getRoomKey(roomId)}:invited`;
  }

  async createRoom(room: RoomInfo): Promise<string> {
    const roomId = uuid();
    const key = this.getRoomKey(roomId);
    const exists = await this.redisClient.exists(key);
    if (exists) {
      this.logger.error(`Room ${roomId} already exists`);
      throw new Error('Room already exists');
    }

    await Promise.all([
      this.redisClient.hset(key, 'hostId', room.hostId, 'maxPlayers', room.maxPlayers),
      this.redisClient.expire(key, this.ttl),
      this.redisClient.set(this.getStatusKey(roomId), 'WAITING', 'EX', this.ttl),
      this.redisClient.sadd(this.getUsersKey(roomId), room.hostId),
      this.redisClient.expire(this.getUsersKey(roomId), this.ttl),
      this.redisClient.rpush(this.getOrderedUsersKey(roomId), String(room.hostId)),
      this.redisClient.expire(this.getOrderedUsersKey(roomId), this.ttl),
      this.redisClient.hset(this.CUSTOM_USERS, room.hostId, roomId),
      this.redisClient.expire(this.CUSTOM_USERS, this.ttl),
    ]);
    this.logger.info(`Created custom room ${roomId} with host ${room.hostId}`);
    return roomId;
  }

  async addUserToRoom(roomId: string, userId: number): Promise<void> {
    if (await this.isRoomFull(roomId)) {
      throw new Error('Room is full');
    }
    if (!(await this.isUserInvited(roomId, userId))) {
      throw new Error('User is not invited');
    }

    const usersKey = this.getUsersKey(roomId);
    await this.redisClient.sadd(usersKey, String(userId));
    await this.redisClient.expire(usersKey, this.ttl);

    const orderedUsersKey = this.getOrderedUsersKey(roomId);
    await this.redisClient.rpush(orderedUsersKey, String(userId));
    await this.redisClient.expire(orderedUsersKey, this.ttl);

    await this.redisClient.srem(this.getInvitedKey(roomId), String(userId));

    await this.redisClient.hset(this.CUSTOM_USERS, userId, roomId);
    await this.redisClient.expire(this.CUSTOM_USERS, this.ttl);
    this.logger.info(`User ${userId} joined room ${roomId}`);
  }

  async addInvitedUserToRoom(roomId: string, userId: number): Promise<void> {
    const usersKey = this.getInvitedKey(roomId);
    await this.redisClient.sadd(usersKey, String(userId));
    await this.redisClient.expire(usersKey, this.ttl);

    this.logger.info(`User ${userId} invited room ${roomId}`);
  }

  private async isRoomFull(roomId: string) {
    const room = await this.getRoomInfo(roomId);
    return room.maxPlayers === (await this.getNumberOfUsersInRoom(roomId));
  }

  async getRoomInfo(roomId: string): Promise<RoomInfo> {
    const roomKey = this.getRoomKey(roomId);
    const room = await this.redisClient.hgetall(roomKey);
    if (!room) {
      this.logger.error(`Room ${roomId} does not exist`);
      throw new Error('Room does not exist');
    }
    return {
      hostId: Number(room.hostId),
      maxPlayers: Number(room.maxPlayers),
    };
  }

  async isRoomHost(roomId: string, userId: number): Promise<boolean> {
    const room = await this.getRoomInfo(roomId);
    return room.hostId === userId;
  }

  async getUsersInRoom(roomId: string): Promise<number[]> {
    const key = this.getUsersKey(roomId);
    const userIds = await this.redisClient.smembers(key);
    return userIds.map(Number);
  }

  async getNumberOfUsersInRoom(roomId: string): Promise<number> {
    const key = this.getUsersKey(roomId);
    return await this.redisClient.scard(key);
  }

  async isUserInvited(roomId: string, userId: number): Promise<boolean> {
    const key = this.getInvitedKey(roomId);
    return (await this.redisClient.sismember(key, userId)) === 1;
  }

  async isUserHost(roomId: string, userId: number): Promise<boolean> {
    const room = await this.getRoomInfo(roomId);
    return room.hostId === userId;
  }

  async inviteUserToRoom(roomId: string, userId: number): Promise<void> {
    const key = this.getInvitedKey(roomId);
    await this.redisClient.sadd(key, userId);
    await this.redisClient.expire(key, this.ttl);
    this.logger.info(`User ${userId} invited to room ${roomId}`);
  }

  async removeUserFromRoom(roomId: string, userId: number): Promise<void> {
    const usersKey = this.getUsersKey(roomId);
    await this.redisClient.srem(this.getUsersKey(roomId), String(userId));

    const invitedKey = this.getInvitedKey(roomId);
    await this.redisClient.srem(invitedKey, String(userId));

    await this.redisClient.hdel(this.CUSTOM_USERS, String(userId));
    this.logger.info(`User ${userId} left room ${roomId}`);

    const userCount = await this.redisClient.scard(usersKey);
    const room = await this.getRoomInfo(roomId);
    if (userCount < room.maxPlayers) {
      await this.redisClient.set(this.getStatusKey(roomId), 'WAITING', 'EX', this.ttl);
      this.logger.info(`Room ${roomId} is now WAITING`);
    }

    if (userCount === 0) {
      await this.deleteRoom(roomId);
      this.logger.info(`Room ${roomId} deleted due to inactivity`);
    }
  }

  async getRoomIdByUserId(userId: number): Promise<string | null> {
    const roomId = await this.redisClient.hget(this.CUSTOM_USERS, String(userId));
    if (!roomId) {
      return null;
    }
    return roomId;
  }

  async disconnectedUser(userId: number): Promise<void> {
    const roomId = await this.getRoomIdByUserId(userId);
    if (!roomId) {
      return;
    }

    if (
      (await this.isUserHost(roomId, userId)) &&
      0 < (await this.getNumberOfUsersInRoom(roomId))
    ) {
      await this.popFromOrderedUsers(roomId);
      const nextHostId = await this.redisClient.lindex(this.getOrderedUsersKey(roomId), 0);
      await this.changeRoomHost(roomId, Number(nextHostId));
    }
    this.removeUserFromRoom(roomId, userId);
  }

  private async popFromOrderedUsers(roomId: string) {
    await this.redisClient.lpop(this.getOrderedUsersKey(roomId));
  }

  async changeRoomHost(roomId: string, newHostId: number): Promise<void> {
    const roomKey = this.getRoomKey(roomId);
    await this.redisClient.hset(roomKey, 'hostId', newHostId);
  }

  async deleteRoom(roomId: string): Promise<void> {
    const key = this.getRoomKey(roomId);
    const exists = await this.redisClient.exists(key);
    if (!exists) {
      this.logger.error(`Room ${roomId} does not exist`);
      return;
    }

    await Promise.all([
      this.redisClient.del(key),
      this.redisClient.del(this.getUsersKey(roomId)),
      this.redisClient.del(this.getStatusKey(roomId)),
      this.redisClient.del(this.getInvitedKey(roomId)),
    ]);
    this.logger.info(`Deleted custom room ${roomId}`);
  }
}
