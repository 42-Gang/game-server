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
        return "ROOM_FULL"      -- 남은 자리가 없으면 에러 리턴
      end
    
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

    this.logger.info(`result: ${result}`);

    if (result === 'ROOM_FULL') {
      this.logger.error(`Room ${roomId} is full`);
      throw new Error('Room is full');
    }

    await this.redisClient.hset(this.CUSTOM_USERS, String(userId), roomId);
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

  async isRoomHost(roomId: string, userId: number): Promise<boolean> {
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
    this.logger.info('removeUserFromRoom');

    const orderedKey = this.getOrderedUsersKey(roomId);

    // 1) 누가 나가는지 확인
    const currentHost = await this.getHostId(roomId);
    if (currentHost === userId) {
      // 1) 호스트 자신을 리스트에서 제거
      await this.redisClient.lpop(orderedKey);

      // 2) 새 헤드를 확인
      const newHostId = await this.redisClient.lindex(orderedKey, 0);
      if (!newHostId) {
        // 더 남은 유저가 없으면 방 삭제
        this.logger.info(`No users left in room ${roomId}, deleting room`);
        await this.deleteRoom(roomId);
        return;
      }

      // 3) 실제 호스트 교체
      await this.changeRoomHost(roomId, Number(newHostId));
      this.logger.info(`Room ${roomId} host changed to ${newHostId}`);
    } else {
      // ── 일반 유저는 LREM으로 하나만 제거 ──
      await this.redisClient.lrem(orderedKey, 0, String(userId));
    }

    // 2) Set에서만 제거
    await this.removeUser(roomId, userId);

    // 3) invited, CUSTOM_USERS 정리
    await this.redisClient.srem(this.getInvitedKey(roomId), String(userId));
    await this.redisClient.hdel(this.CUSTOM_USERS, String(userId));

    // 4) 방 상태·삭제 판단
    const userCount = await this.getNumberOfUsersInRoom(roomId);
    if (userCount === 0) {
      await this.deleteRoom(roomId);
      this.logger.info(`Room ${roomId} deleted due to inactivity`);
    } else if (userCount < (await this.getRoomInfo(roomId)).maxPlayers) {
      await this.redisClient.set(this.getStatusKey(roomId), 'WAITING', 'EX', this.ttl);
      this.logger.info(`Room ${roomId} is now WAITING`);
    }
  }

  private async removeUser(roomId: string, userId: number) {
    const usersKey = this.getUsersKey(roomId);
    await this.redisClient.srem(usersKey, userId);
  }

  async getRoomIdByUserId(userId: number): Promise<string | null> {
    const roomId = await this.redisClient.hget(this.CUSTOM_USERS, String(userId));
    if (!roomId) {
      return null;
    }
    return roomId;
  }

  async disconnectedUser(userId: number): Promise<void> {
    this.logger.info('disconnectedUser');
    const roomId = await this.getRoomIdByUserId(userId);
    if (!roomId) {
      return;
    }

    await this.removeUserFromRoom(roomId, userId);
    if ((await this.isRoomExists(roomId)) && 1 <= (await this.getNumberOfUsersInRoom(roomId))) {
      const nextHostId = await this.getNextHostIdFromOrderedUsers(roomId);
      if (!nextHostId) {
        this.logger.error(`No next host found for room ${roomId}`);
        throw new Error('No next host found');
      }
      await this.changeRoomHost(roomId, Number(nextHostId));
    }
  }

  async isRoomExists(roomId: string): Promise<boolean> {
    const key = this.getRoomKey(roomId);
    const exists = await this.redisClient.exists(key);
    return exists === 1;
  }

  async getHostId(roomId: string): Promise<number> {
    const roomKey = this.getRoomKey(roomId);
    const hostId = await this.redisClient.hget(roomKey, 'hostId');
    if (!hostId) {
      this.logger.error(`Host ID not found for room ${roomId}`);
      throw new Error('Host ID not found');
    }
    return Number(hostId);
  }

  private async getNextHostIdFromOrderedUsers(roomId: string) {
    return await this.redisClient.lindex(this.getOrderedUsersKey(roomId), 0);
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
