import { beforeEach, describe, expect, it } from 'vitest';
import SocketCache from '../../../../src/v1/storage/cache/socket.cache.js';
import { redis } from '../../../../src/plugins/redis.js';

describe('SocketCache (with real Redis)', () => {
  let cache: SocketCache;

  beforeEach(async () => {
    await redis.flushdb();
    cache = new SocketCache(redis);
  });

  it('setSocketId: 소켓 ID를 Redis에 저장한다', async () => {
    const key = 'socket:testns:1';
    await redis.del(key);

    await cache.setSocketId({ userId: 1, socketId: 'abc123', namespace: 'testns' });
    const value = await redis.get(key);

    expect(value).toBe('abc123');
  });

  it('getSocketId: 저장된 소켓 ID를 반환한다', async () => {
    const key = 'socket:testns:2';
    await redis.set(key, 'xyz789');

    const result = await cache.getSocketId({ userId: 2, namespace: 'testns' });
    expect(result).toBe('xyz789');
  });

  it('deleteSocketId: 소켓 ID를 삭제한다', async () => {
    const key = 'socket:testns:3';
    await redis.set(key, 'todelete');

    await cache.deleteSocketId({ userId: 3, namespace: 'testns' });
    const result = await redis.get(key);

    expect(result).toBeNull();
  });

  it('getSocketId: 값이 없으면 null 반환', async () => {
    await redis.del('socket:testns:999');

    const result = await cache.getSocketId({ userId: 999, namespace: 'testns' });
    expect(result).toBeNull();
  });
});
