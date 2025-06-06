import { beforeEach, describe, expect, it } from 'vitest';
import { redis } from '../../../../src/plugins/redis.js';
import PlayerCache, {
  BASE_PLAYER_KEY_PREFIX,
  type PlayerCacheType,
} from '../../../../src/v1/storage/cache/player.cache.js';

let cache: PlayerCache;

beforeEach(async () => {
  // 각 테스트 전에 Redis를 초기화
  await redis.flushdb();
  cache = new PlayerCache(redis);
});

describe('isExists', () => {
  it('should return false if player does not exist', async () => {
    const exists = await cache.isExists('123');
    expect(exists).toBe(false);
  });

  it('should return true after setPlayer is called', async () => {
    const data: PlayerCacheType = {
      id: 123,
      nickname: 'testUser',
      avatar: 'https://example.com/avatar.png',
    };
    await cache.setPlayer('123', data);

    const exists = await cache.isExists('123');
    expect(exists).toBe(true);
  });
});

describe('setPlayer', () => {
  it('should store the player fields in a Redis hash', async () => {
    const data: PlayerCacheType = {
      id: 456,
      nickname: 'alice',
      avatar: 'https://example.com/alice.png',
    };
    await cache.setPlayer('456', data);

    const key = `${BASE_PLAYER_KEY_PREFIX}:456`;
    const raw = await redis.get(key);
    const parsed = JSON.parse(raw);

    // Redis는 문자열로 저장하므로 비교할 때 타입 변환
    expect(parsed.id).toBe(data.id);
    expect(parsed.nickname).toBe(data.nickname);
    expect(parsed.avatar).toBe(data.avatar);
  });

  it('should set a TTL on the player key', async () => {
    const data: PlayerCacheType = {
      id: 789,
      nickname: 'bob',
      avatar: 'https://example.com/bob.png',
    };
    await cache.setPlayer('789', data);

    const key = `${BASE_PLAYER_KEY_PREFIX}:789`;
    const ttl = await redis.ttl(key);
    expect(ttl).toBeGreaterThan(0);
  });

  it('should overwrite existing data and reset TTL', async () => {
    const firstData: PlayerCacheType = {
      id: 321,
      nickname: 'charlie',
      avatar: 'https://example.com/charlie.png',
    };
    await cache.setPlayer('321', firstData);

    // wait a moment and overwrite
    await new Promise((r) => setTimeout(r, 10));

    const secondData: PlayerCacheType = {
      id: 321,
      nickname: 'charlieUpdated',
      avatar: 'https://example.com/charlie2.png',
    };
    await cache.setPlayer('321', secondData);

    const key = `${BASE_PLAYER_KEY_PREFIX}:321`;
    const raw = await redis.get(key);
    const parsed = JSON.parse(raw);

    expect(parsed.nickname).toBe(secondData.nickname);
    expect(parsed.avatar).toBe(secondData.avatar);

    // TTL should still be > 0 (reset on second set)
    const ttl = await redis.ttl(key);
    expect(ttl).toBeGreaterThan(0);
  });
});

describe('getPlayer', () => {
  it('should retrieve player data from cache', async () => {
    const data: PlayerCacheType = {
      id: 654,
      nickname: 'dave',
      avatar: 'https://example.com/dave.png',
    };
    await cache.setPlayer('654', data);

    const playerData = await cache.getPlayer('654');
    expect(playerData).toEqual(data);
  });

  it('should throw an error if player does not exist', async () => {
    await expect(cache.getPlayer('999')).rejects.toThrow('Player with ID 999 not found in cache.');
  });
});
