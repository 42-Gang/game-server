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

    const tx = this.redisClient.multi();

    await Promise.all([
      tx.hset(key, 'hostId', room.hostId, 'maxPlayers', room.maxPlayers),
      tx.expire(key, this.ttl),
      tx.set(this.getStatusKey(roomId), 'WAITING', 'EX', this.ttl),
      tx.sadd(this.getUsersKey(roomId), room.hostId),
      tx.expire(this.getUsersKey(roomId), this.ttl),
      tx.rpush(this.getOrderedUsersKey(roomId), String(room.hostId)),
      tx.expire(this.getOrderedUsersKey(roomId), this.ttl),
      tx.hset(this.CUSTOM_USERS, room.hostId, roomId),
      tx.expire(this.CUSTOM_USERS, this.ttl),
    ]);

    await tx.exec();

    this.logger.info(`Created custom room ${roomId} with host ${room.hostId}`);
    return roomId;
  }

  async addUserToRoom(roomId: string, userId: number): Promise<void> {
    const usersKey = this.getUsersKey(roomId);
    const orderedKey = this.getOrderedUsersKey(roomId);

    if (!(await this.isUserInvited(roomId, userId))) {
      this.logger.error(`User ${userId} is not invited to room ${roomId}`);
      throw new Error('User is not invited to this room');
    }

    const addUser = `
      -- KEYS[1] : usersKey (Set)
      -- KEYS[2] : orderedKey (List)
      -- ARGV[1] : maxPlayers
      -- ARGV[2] : userId
    
      local current = redis.call('SCARD', KEYS[1])
      if tonumber(current) >= tonumber(ARGV[1]) then
        return {err="ROOM_FULL"}      -- 남은 자리가 없으면 에러 리턴
      end
    
      -- 자리 있으면 추가
      redis.call('SADD', KEYS[1], ARGV[2])
      redis.call('RPUSH', KEYS[2], ARGV[2])
      return {ok="OK"}                 -- 성공 리턴
    `;

    const room = await this.getRoomInfo(roomId);
    const maxPlayers = room.maxPlayers;
    const result = await this.redisClient.eval(
      addUser,
      2,
      usersKey,
      orderedKey,
      maxPlayers,
      String(userId),
    );

    if (result === 'ROOM_FULL') {
      this.logger.error(`Room \${roomId} is full`);
      throw new Error('Room is full');
    }
  }

  async addInvitedUserToRoom(roomId: string, userId: number): Promise<void> {
    const usersKey = this.getInvitedKey(roomId);
    await this.redisClient.sadd(usersKey, String(userId));
    await this.redisClient.expire(usersKey, this.ttl);

    this.logger.info(`User ${userId} invited room ${roomId}`);
  }

  async getRoomInfo(roomId: string): Promise<RoomInfo> {
    const roomKey = this.getRoomKey(roomId);
    const room = await this.redisClient.hgetall(roomKey);
    if (!room || Object.keys(room).length === 0) {
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
      2 <= (await this.getNumberOfUsersInRoom(roomId))
    ) {
      await this.popFromOrderedUsers(roomId);
      const nextHostId = await this.getNextHostIdFromOrderedUsers(roomId);
      await this.changeRoomHost(roomId, Number(nextHostId));
    }
    await this.removeUserFromRoom(roomId, userId);
  }

  private async getNextHostIdFromOrderedUsers(roomId: string) {
    return await this.redisClient.lindex(this.getOrderedUsersKey(roomId), 0);
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
      throw new Error('Room not found');
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
