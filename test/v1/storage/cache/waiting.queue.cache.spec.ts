import { beforeEach, describe, expect, it, vi } from 'vitest';
import WaitingQueueCache from '../../../../src/v1/storage/cache/waiting.queue.cache.js';

describe('WaitingQueueCache', () => {
  let redisMock: any;
  let loggerMock: any;
  let cache: WaitingQueueCache;

  beforeEach(() => {
    redisMock = {
      rpush: vi.fn(),
      llen: vi.fn(),
      lpop: vi.fn(),
    };
    loggerMock = {
      info: vi.fn(),
    };
    cache = new WaitingQueueCache(redisMock, loggerMock);
  });

  it('addToQueue: 유저를 큐에 추가한다', async () => {
    await cache.addUser(4, 123);
    expect(redisMock.rpush).toHaveBeenCalledWith('waiting-queue:4', 123);
    expect(loggerMock.info).toHaveBeenCalledWith('Adding user 123 to waiting queue');
  });

  it('getQueueLength: 큐 길이를 반환한다', async () => {
    redisMock.llen.mockResolvedValue(3);
    const length = await cache.getCurrentQueueSize(4);
    expect(length).toBe(3);
    expect(loggerMock.info).toHaveBeenCalledWith('Current queue length: 3');
  });

  it('canStartGame: 큐에 충분한 인원이 있으면 true 반환', async () => {
    redisMock.llen.mockResolvedValue(4);
    await expect(cache.isQueueReady(4)).resolves.toBe(true);
  });

  it('canStartGame: 큐에 인원이 부족하면 false 반환', async () => {
    redisMock.llen.mockResolvedValue(2);
    await expect(cache.isQueueReady(4)).resolves.toBe(false);
  });

  it('popForGame: 충분한 인원이 있으면 유저를 꺼내 반환', async () => {
    redisMock.llen.mockResolvedValue(4);
    redisMock.lpop
      .mockResolvedValueOnce('1')
      .mockResolvedValueOnce('2')
      .mockResolvedValueOnce('3')
      .mockResolvedValueOnce('4');
    const users = await cache.popUsersForMatch(4);
    expect(users).toEqual([1, 2, 3, 4]);
    expect(loggerMock.info).toHaveBeenCalledWith('Popped users for game: 1,2,3,4');
  });

  it('popForGame: 인원이 부족하면 에러 발생', async () => {
    redisMock.llen.mockResolvedValue(2);
    await expect(cache.popUsersForMatch(4)).rejects.toThrow(
      'Not enough users in the queue to start a game',
    );
  });

  it('popForGame: lpop에서 null 반환 시 에러 발생', async () => {
    redisMock.llen.mockResolvedValue(4);
    redisMock.lpop.mockResolvedValueOnce('1').mockResolvedValueOnce(null);
    await expect(cache.popUsersForMatch(4)).rejects.toThrow('No more users in the queue');
  });
});
