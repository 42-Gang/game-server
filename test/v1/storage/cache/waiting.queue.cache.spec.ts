import { beforeEach, describe, expect, it, vi } from 'vitest';
import WaitingQueueCache from '../../../../src/v1/storage/cache/waiting.queue.cache.js';
import { redis } from '../../../../src/plugins/redis.js';

describe('WaitingQueueCache', () => {
  let loggerMock: any;
  let cache: WaitingQueueCache;

  beforeEach(async () => {
    loggerMock = {
      info: vi.fn(),
    };
    cache = new WaitingQueueCache(redis, loggerMock);
  });

  it('addToQueue: 유저를 큐에 추가한다', async () => {
    await redis.del('waiting-queue:4');

    await cache.addUser(4, 123);
    const length = await cache.getCurrentQueueSize(4);
    expect(length).toBe(1);
  });

  it('getQueueLength: 큐 길이를 반환한다', async () => {
    await redis.del('waiting-queue:4');

    const length = await cache.getCurrentQueueSize(4);
    expect(length).toBe(0);
  });

  it('canStartGame: 큐에 충분한 인원이 있으면 true 반환', async () => {
    await redis.del('waiting-queue:4');
    await cache.addUser(4, 123);
    await cache.addUser(4, 124);
    await cache.addUser(4, 125);
    await cache.addUser(4, 126);

    const result = await cache.isQueueReady(4);
    expect(result).toBe(true);
  });

  it('canStartGame: 큐에 인원이 부족하면 false 반환', async () => {
    await redis.del('waiting-queue:4');

    await expect(cache.isQueueReady(4)).resolves.toBe(false);
  });

  it('popForGame: 충분한 인원이 있으면 유저를 꺼내 반환', async () => {
    await redis.del('waiting-queue:4');
    await cache.addUser(4, 1);
    await cache.addUser(4, 2);
    await cache.addUser(4, 3);
    await cache.addUser(4, 4);

    const users = await cache.popUsersForMatch(4);
    expect(users).toEqual([1, 2, 3, 4]);
    expect(loggerMock.info).toHaveBeenCalledWith('Popped users for game: 1,2,3,4');
  });

  it('popForGame: 인원이 부족하면 에러 발생', async () => {
    await redis.del('waiting-queue:4');

    await expect(cache.popUsersForMatch(4)).rejects.toThrow(
      'Not enough users in the queue to start a game',
    );
  });

  it('popForGame: lpop에서 null 반환 시 에러 발생', async () => {
    await redis.del('waiting-queue:4');

    await expect(cache.popUsersForMatch(4)).rejects.toThrow(Error);
  });

  it('removeFromQueue: 유저를 큐에서 제거한다', async () => {
    await redis.del('waiting-queue:4');

    await cache.addUser(4, 123);
    await cache.removeUser(4, 123);

    const size = await cache.getCurrentQueueSize(4);
    expect(size).toBe(0);
  });
});
