import { beforeEach, describe, it, expect, vi } from 'vitest';
import { redis } from '../../../../src/plugins/redis.js';
import MatchServerCache from '../../../../src/v1/storage/cache/match-server.cache.js';

describe('MatchServerCache', () => {
  let cache: MatchServerCache;

  beforeEach(async () => {
    // Redis DB 초기화 및 캐시 인스턴스 생성
    await redis.flushdb();
    cache = new MatchServerCache(redis as any);
  });

  describe('getMatchServers', () => {
    it('should return an empty array when no servers are registered', async () => {
      const servers = await cache.getMatchServers();
      expect(servers).toEqual([]);
    });

    it('should return server info with default gameCount = 0', async () => {
      // 기본 서버 키 설정 (game-count 키는 없는 경우)
      await redis.set('match-server:serverA', 'serverA');
      await redis.set('match-server:serverB', 'serverB');

      const servers = await cache.getMatchServers();

      // 배열 순서를 보장할 수 없으므로 include 검사
      expect(servers).toContainEqual({ serverName: 'serverA', gameCount: 0 });
      expect(servers).toContainEqual({ serverName: 'serverB', gameCount: 0 });
    });

    it('should throw if a retrieved server name is invalid', async () => {
      // 빈 문자열을 값으로 설정하여 오류 유발
      await redis.set('match-server:bad', '');
      await expect(cache.getMatchServers()).rejects.toThrow(
        'Invalid server name retrieved from Redis',
      );
    });
  });

  describe('getBestMatchServer', () => {
    it('should throw when no servers available', async () => {
      await expect(cache.getBestMatchServer()).rejects.toThrow('No match servers available');
    });

    it('should return the server with the lowest gameCount', async () => {
      // getMatchServers 결과를 스텁하여 reduce 로직만 검증
      vi.spyOn(cache, 'getMatchServers').mockResolvedValue([
        { serverName: 'A', gameCount: 10 },
        { serverName: 'B', gameCount: 3 },
        { serverName: 'C', gameCount: 5 },
      ]);

      const best = await cache.getBestMatchServer();
      expect(best).toEqual({ serverName: 'B', gameCount: 3 });
    });
  });
});
