import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redis } from '../../../../src/plugins/redis.js';
import CustomRoomCache from '../../../../src/v1/storage/cache/custom.room.cache.js';
import { FastifyBaseLogger } from 'fastify';

describe('CustomRoomCache', () => {
  let cache: CustomRoomCache;

  beforeEach(async () => {
    const loggerMock = {
      info: vi.fn((x) => console.log(x)),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn(() => loggerMock),
      level: vi.fn(() => loggerMock),
      silent: vi.fn(() => loggerMock),
    } as unknown as FastifyBaseLogger;
    cache = new CustomRoomCache(redis, loggerMock);
  });

  describe('createRoom', () => {
    it('create', async () => {
      const roomId = await cache.createRoom({
        hostId: 1,
        maxPlayers: 4,
      });

      const room = await cache.getRoomInfo(roomId);
      expect(room).toEqual({
        hostId: 1,
        maxPlayers: 4,
      });
    });

    it('create(already exist)', async () => {
      const spy = vi.spyOn(redis, 'exists').mockResolvedValueOnce(1);

      await expect(
        cache.createRoom({
          hostId: 1,
          maxPlayers: 4,
        }),
      ).rejects.toThrow(Error);

      spy.mockRestore(); // 원래 Redis.exists 복구
    });
  });

  it('getUsers', async () => {
    const roomId = await cache.createRoom({
      hostId: 1,
      maxPlayers: 4,
    });

    const players = await cache.getUsersInRoom(roomId);

    expect(players).toEqual([1]);
  });

  describe('join', () => {
    it('join', async () => {
      const roomId = await cache.createRoom({
        hostId: 1,
        maxPlayers: 4,
      });

      await cache.addInvitedUserToRoom(roomId, 2);
      await cache.addUserToRoom(roomId, 2);
      const players = await cache.getUsersInRoom(roomId);
      await cache.deleteRoom(roomId);

      expect(players).toEqual([1, 2]);
    });

    it('join(full)', async () => {
      const roomId = await cache.createRoom({
        hostId: 1,
        maxPlayers: 2,
      });

      await cache.addInvitedUserToRoom(roomId, 2);
      await cache.addUserToRoom(roomId, 2);
      const players = await cache.getUsersInRoom(roomId);
      await cache.deleteRoom(roomId);

      expect(players).toEqual([1, 2]);
    });

    it('join(already full)', async () => {
      const roomId = await cache.createRoom({
        hostId: 1,
        maxPlayers: 2,
      });

      await cache.addInvitedUserToRoom(roomId, 2);
      await cache.addUserToRoom(roomId, 2);

      await cache.addInvitedUserToRoom(roomId, 3);
      await expect(cache.addUserToRoom(roomId, 3)).rejects.toThrow(Error);
      await cache.deleteRoom(roomId);
    });

    it('join(not invited)', async () => {
      const roomId = await cache.createRoom({
        hostId: 1,
        maxPlayers: 4,
      });

      await expect(cache.addUserToRoom(roomId, 2)).rejects.toThrow(Error);
      await cache.deleteRoom(roomId);
    });
  });

  it('removeUser', async () => {
    const roomId = await cache.createRoom({
      hostId: 1,
      maxPlayers: 4,
    });

    await cache.addInvitedUserToRoom(roomId, 2);
    await cache.addUserToRoom(roomId, 2);
    await cache.removeUserFromRoom(roomId, 2);

    const users = await cache.getUsersInRoom(roomId);
    await cache.deleteRoom(roomId);

    expect(users).toEqual([1]);
  });

  describe('deleteRoom', () => {
    it('deleteRoom', async () => {
      const roomId = await cache.createRoom({
        hostId: 1,
        maxPlayers: 4,
      });

      await cache.deleteRoom(roomId);

      await expect(cache.getRoomInfo(roomId)).rejects.toThrow(Error);
    });

    it('deleteRoom (does not exist)', async () => {
      const roomId = 'nonexistent-room-id';
      await expect(cache.deleteRoom(roomId)).rejects.toThrow(Error);
    });
  });

  describe('isUserInvited', () => {
    it('isUserInvited (invited)', async () => {
      const roomId = await cache.createRoom({
        hostId: 1,
        maxPlayers: 4,
      });

      await cache.inviteUserToRoom(roomId, 2);
      const isInvited = await cache.isUserInvited(roomId, 2);
      await cache.deleteRoom(roomId);

      expect(isInvited).toBe(true);
    });

    it('isUserInvited (not invited)', async () => {
      const roomId = await cache.createRoom({
        hostId: 1,
        maxPlayers: 4,
      });

      await cache.inviteUserToRoom(roomId, 2);
      const isInvited = await cache.isUserInvited(roomId, 3);
      await cache.deleteRoom(roomId);

      expect(isInvited).toBe(false);
    });
  });

  it('should have TTL on keys', async () => {
    const roomId = await cache.createRoom({
      hostId: 1,
      maxPlayers: 4,
    });

    const ttlRoom = await redis.ttl(`custom-room:${roomId}`);
    const ttlStatus = await redis.ttl(`custom-room:${roomId}:status`);
    const ttlUsers = await redis.ttl(`custom-room:${roomId}:users`);

    await cache.deleteRoom(roomId);

    expect(ttlRoom).toBeGreaterThan(0);
    expect(ttlStatus).toBeGreaterThan(0);
    expect(ttlUsers).toBeGreaterThan(0);
  });

  describe('isRoomHost', () => {
    it('is user host', async () => {
      const roomId = await cache.createRoom({
        hostId: 1,
        maxPlayers: 4,
      });

      const isHost = await cache.isRoomHost(roomId, 1);
      await cache.deleteRoom(roomId);

      expect(isHost).toBe(true);
    });

    it('is not user host', async () => {
      const roomId = await cache.createRoom({
        hostId: 1,
        maxPlayers: 4,
      });

      const isHost = await cache.isRoomHost(roomId, 2);
      await cache.deleteRoom(roomId);

      expect(isHost).toBe(false);
    });
  });

  describe('isHost', () => {
    it('isHost', async () => {
      const roomId = await cache.createRoom({
        hostId: 1,
        maxPlayers: 4,
      });

      const isHost = await cache.isRoomHost(roomId, 1);
      await cache.deleteRoom(roomId);

      expect(isHost).toBe(true);
    });

    it('is not host', async () => {
      const roomId = await cache.createRoom({
        hostId: 1,
        maxPlayers: 4,
      });

      const isHost = await cache.isRoomHost(roomId, 2);
      await cache.deleteRoom(roomId);

      expect(isHost).toBe(false);
    });
  });

  describe('getNumberOfUsersInRoom', () => {
    it('should return the number of users in the room', async () => {
      const roomId = await cache.createRoom({
        hostId: 1,
        maxPlayers: 4,
      });

      await cache.addInvitedUserToRoom(roomId, 2);
      await cache.addUserToRoom(roomId, 2);
      const userCount = await cache.getNumberOfUsersInRoom(roomId);
      await cache.deleteRoom(roomId);

      expect(userCount).toBe(2);
    });

    it('should return 0 for an empty room', async () => {
      const roomId = await cache.createRoom({
        hostId: 1,
        maxPlayers: 4,
      });

      const userCount = await cache.getNumberOfUsersInRoom(roomId);
      await cache.deleteRoom(roomId);

      expect(userCount).toBe(1); // Only the host is present
    });
  });
});
