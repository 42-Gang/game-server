import { Redis } from 'ioredis';
import { FastifyBaseLogger } from 'fastify';
import { v4 as uuid } from 'uuid';

interface RoomInfo {
  hostId: number;
  maxPlayers: number;
}

export default class CustomRoomCache {
  ttl = 60 * 10;

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
      this.redisClient.set(key, JSON.stringify(room), 'EX', this.ttl),
      this.redisClient.set(this.getStatusKey(roomId), 'WAITING', 'EX', this.ttl),
      this.redisClient.sadd(this.getUsersKey(roomId), room.hostId),
      this.redisClient.expire(this.getUsersKey(roomId), this.ttl),
      this.redisClient.hset('custom:users', room.hostId, roomId),
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

    await this.redisClient.hset('custom:users', userId, roomId);
    this.logger.info(`User ${userId} joined room ${roomId}`);
  }

  async addInvitedUserToRoom(roomId: string, userId: number): Promise<void> {
    const usersKey = this.getInvitedKey(roomId);
    await this.redisClient.sadd(usersKey, String(userId));
    this.logger.info(`User ${userId} invited room ${roomId}`);
  }

  private async isRoomFull(roomId: string) {
    const room = await this.getRoomInfo(roomId);
    return room.maxPlayers === (await this.getNumberOfUsersInRoom(roomId));
  }

  async getRoomInfo(roomId: string): Promise<RoomInfo> {
    const raw = await this.redisClient.get(this.getRoomKey(roomId));
    if (!raw) {
      this.logger.error(`Room ${roomId} not found`);
      throw new Error('Room not found');
    }

    return JSON.parse(raw);
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
    this.logger.info(`User ${userId} invited to room ${roomId}`);
  }

  async removeUserFromRoom(roomId: string, userId: number): Promise<void> {
    const usersKey = this.getUsersKey(roomId);
    await this.redisClient.srem(usersKey, String(userId));
    await this.redisClient.hdel('custom:users', String(userId));
    this.logger.info(`User ${userId} left room ${roomId}`);

    const userCount = await this.redisClient.scard(usersKey);
    const room = await this.getRoomInfo(roomId);
    if (userCount < room.maxPlayers) {
      await this.redisClient.set(this.getStatusKey(roomId), 'WAITING');
      this.logger.info(`Room ${roomId} is now WAITING`);
    }

    if (userCount === 0) {
      await this.deleteRoom(roomId);
      this.logger.info(`Room ${roomId} deleted due to inactivity`);
    }
  }

  async disconnectedUser(userId: number): Promise<void> {
    const roomId = await this.redisClient.hget('custom:users', String(userId));
    if (!roomId) {
      return;
    }

    this.removeUserFromRoom(roomId, userId);
  }

  async deleteRoom(roomId: string): Promise<void> {
    const key = this.getRoomKey(roomId);
    const exists = await this.redisClient.exists(key);
    if (!exists) {
      this.logger.error(`Room ${roomId} does not exist`);
      throw new Error('Room does not exist');
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
