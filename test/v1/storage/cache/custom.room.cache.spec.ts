import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redis } from '../../../../src/plugins/redis.js';
import CustomRoomCache from '../../../../src/v1/storage/cache/custom.room.cache.js';
import { FastifyBaseLogger } from 'fastify';

describe('CustomRoomCache', () => {
  let cache: CustomRoomCache;

  beforeEach(() => {
    const loggerMock = {
      info: vi.fn(),
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

  it('create', async () => {
    const roomId = await cache.createRoom({
      hostId: 1,
      maxPlayers: 4,
      createdAt: Date.now(),
    });

    const room = await cache.getRoomInfo(roomId);
    await cache.deleteRoom(roomId);
    expect(room).toEqual({
      hostId: 1,
      maxPlayers: 4,
      createdAt: room.createdAt,
    });
  });

  it('create(already exist)', async () => {
    const spy = vi.spyOn(redis, 'exists').mockResolvedValueOnce(1);

    await expect(
      cache.createRoom({
        hostId: 1,
        maxPlayers: 4,
        createdAt: Date.now(),
      }),
    ).rejects.toThrow(Error);

    spy.mockRestore(); // 원래 Redis.exists 복구
  });

  it('getUsers', async () => {
    const roomId = await cache.createRoom({
      hostId: 1,
      maxPlayers: 4,
      createdAt: Date.now(),
    });

    const players = await cache.getUsersInRoom(roomId);
    await cache.deleteRoom(roomId);

    expect(players).toEqual([1]);
  });

  it('join', async () => {
    const roomId = await cache.createRoom({
      hostId: 1,
      maxPlayers: 4,
      createdAt: Date.now(),
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
      createdAt: Date.now(),
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
      createdAt: Date.now(),
    });

    await cache.addInvitedUserToRoom(roomId, 2);
    await cache.addUserToRoom(roomId, 2);

    await expect(cache.addUserToRoom(roomId, 3)).rejects.toThrow(Error);
    await cache.deleteRoom(roomId);
  });

  it('join(not invited)', async () => {
    const roomId = await cache.createRoom({
      hostId: 1,
      maxPlayers: 4,
      createdAt: Date.now(),
    });

    await expect(cache.addUserToRoom(roomId, 2)).rejects.toThrow(Error);
    await cache.deleteRoom(roomId);
  });

  it('removeUser', async () => {
    const roomId = await cache.createRoom({
      hostId: 1,
      maxPlayers: 4,
      createdAt: Date.now(),
    });

    await cache.addInvitedUserToRoom(roomId, 2);
    await cache.addUserToRoom(roomId, 2);
    await cache.removeUserFromRoom(roomId, 2);

    const users = await cache.getUsersInRoom(roomId);
    await cache.deleteRoom(roomId);

    expect(users).toEqual([1]);
  });

  it('deleteRoom', async () => {
    const roomId = await cache.createRoom({
      hostId: 1,
      maxPlayers: 4,
      createdAt: Date.now(),
    });

    await cache.deleteRoom(roomId);

    await expect(cache.getRoomInfo(roomId)).rejects.toThrow('Room not found');
  });

  it('deleteRoom (does not exist)', async () => {
    const roomId = 'nonexistent-room-id';
    await expect(cache.deleteRoom(roomId)).rejects.toThrow(Error);
  });

  it('isUserInvited (invited)', async () => {
    const roomId = await cache.createRoom({
      hostId: 1,
      maxPlayers: 4,
      createdAt: Date.now(),
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
      createdAt: Date.now(),
    });

    await cache.inviteUserToRoom(roomId, 2);
    const isInvited = await cache.isUserInvited(roomId, 3);
    await cache.deleteRoom(roomId);

    expect(isInvited).toBe(false);
  });

  it('should have TTL on keys', async () => {
    const roomId = await cache.createRoom({
      hostId: 1,
      maxPlayers: 4,
      createdAt: Date.now(),
    });

    const redis = (cache as any).redis; // accessing for test
    const ttlRoom = await redis.ttl(`custom-room:${roomId}`);
    const ttlStatus = await redis.ttl(`custom-room:${roomId}:status`);
    const ttlUsers = await redis.ttl(`custom-room:${roomId}:users`);

    await cache.deleteRoom(roomId);

    expect(ttlRoom).toBeGreaterThan(0);
    expect(ttlStatus).toBeGreaterThan(0);
    expect(ttlUsers).toBeGreaterThan(0);
  });
});
