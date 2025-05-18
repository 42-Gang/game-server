import { Redis } from 'ioredis';
import { FastifyBaseLogger } from 'fastify';
import { v4 as uuid } from 'uuid';

interface RoomInfo {
  hostId: number;
  maxPlayers: number;
  createdAt: number;
}

export default class CustomRoomCache {
  ttl = 60 * 10;

  constructor(
    private readonly redis: Redis,
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
    const exists = await this.redis.exists(key);
    if (exists) {
      this.logger.error(`Room ${roomId} already exists`);
      throw new Error('Room already exists');
    }

    await Promise.all([
      this.redis.set(key, JSON.stringify(room), 'EX', this.ttl),
      this.redis.set(this.getStatusKey(roomId), 'WAITING', 'EX', this.ttl),
      this.redis.sadd(this.getUsersKey(roomId), room.hostId),
      this.redis.expire(this.getUsersKey(roomId), this.ttl),
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
    await this.redis.sadd(usersKey, String(userId));
    this.logger.info(`User ${userId} joined room ${roomId}`);
  }

  async addInvitedUserToRoom(roomId: string, userId: number): Promise<void> {
    const usersKey = this.getInvitedKey(roomId);
    await this.redis.sadd(usersKey, String(userId));
    this.logger.info(`User ${userId} joined room ${roomId}`);
  }

  private async isRoomFull(roomId: string) {
    const room = await this.getRoomInfo(roomId);
    return room.maxPlayers === (await this.getNumberOfUsersInRoom(roomId));
  }

  async getRoomInfo(roomId: string): Promise<RoomInfo> {
    const raw = await this.redis.get(this.getRoomKey(roomId));
    if (!raw) {
      this.logger.error(`Room ${roomId} not found`);
      throw new Error('Room not found');
    }

    return JSON.parse(raw);
  }

  async getUsersInRoom(roomId: string): Promise<number[]> {
    const key = this.getUsersKey(roomId);
    const userIds = await this.redis.smembers(key);
    return userIds.map(Number);
  }

  async getNumberOfUsersInRoom(roomId: string): Promise<number> {
    const key = this.getUsersKey(roomId);
    return await this.redis.scard(key);
  }

  async isUserInvited(roomId: string, userId: number): Promise<boolean> {
    const key = this.getInvitedKey(roomId);
    return (await this.redis.sismember(key, userId)) === 1;
  }

  async inviteUserToRoom(roomId: string, userId: number): Promise<void> {
    const key = this.getInvitedKey(roomId);
    await this.redis.sadd(key, userId);
    this.logger.info(`User ${userId} invited to room ${roomId}`);
  }

  async removeUserFromRoom(roomId: string, userId: number): Promise<void> {
    const usersKey = this.getUsersKey(roomId);
    await this.redis.srem(usersKey, String(userId));
    this.logger.info(`User ${userId} left room ${roomId}`);

    const userCount = await this.redis.scard(usersKey);
    const room = await this.getRoomInfo(roomId);
    if (userCount < room.maxPlayers) {
      await this.redis.set(this.getStatusKey(roomId), 'WAITING');
      this.logger.info(`Room ${roomId} is now WAITING`);
    }
  }

  async deleteRoom(roomId: string): Promise<void> {
    const key = this.getRoomKey(roomId);
    const exists = await this.redis.exists(key);
    if (!exists) {
      this.logger.error(`Room ${roomId} does not exist`);
      throw new Error('Room does not exist');
    }

    await Promise.all([
      this.redis.del(key),
      this.redis.del(this.getUsersKey(roomId)),
      this.redis.del(this.getStatusKey(roomId)),
      this.redis.del(this.getInvitedKey(roomId)),
    ]);
    this.logger.info(`Deleted custom room ${roomId}`);
  }
}
