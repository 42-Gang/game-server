import { beforeEach, expect, it, vi } from 'vitest';
import WaitingQueueCache from '../../../../src/v1/storage/cache/waiting.queue.cache.js';
import { redis } from '../../../../src/plugins/redis.js';

let loggerMock: any;
let cache: WaitingQueueCache;

beforeEach(async () => {
  loggerMock = {
    info: vi.fn(),
  };
  await redis.flushdb();
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

it('popForGame: 중간에 lpop에서 null 반환 시 에러 발생', async () => {
  await redis.del('waiting-queue:4');
  await cache.addUser(4, 1);
  await cache.addUser(4, 2);
  await cache.addUser(4, 3);
  await cache.addUser(4, 4);

  // Simulate a situation where lpop returns null
  const originalLpop = redis.lpop.bind(redis);
  redis.lpop = vi.fn().mockResolvedValueOnce(null);

  await expect(cache.popUsersForMatch(4)).rejects.toThrow('No more users in the queue');

  // Restore original lpop function
  redis.lpop = originalLpop;
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

it('isUserInQueue: 유저가 큐에 있으면 true 반환', async () => {
  await redis.del('waiting-queue:4');

  await cache.addUser(4, 123);
  const isInQueue = await cache.isUserInQueue(4, 123);
  expect(isInQueue).toBe(true);
});

it('isUserInQueue: 유저가 큐에 없으면 false 반환', async () => {
  await redis.del('waiting-queue:4');

  const isInQueue = await cache.isUserInQueue(4, 123);
  expect(isInQueue).toBe(false);
});
