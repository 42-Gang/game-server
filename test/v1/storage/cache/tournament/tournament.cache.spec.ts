import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redis } from '../../../../../src/plugins/redis.js';
import TournamentCache, {
  BASE_TOURNAMENT_KEY_PREFIX,
  TOURNAMENT_TTL,
} from '../../../../../src/v1/storage/cache/tournament/tournament.cache.js';
import TournamentMetaCache from '../../../../../src/v1/storage/cache/tournament/tournament.meta.cache.js';
import TournamentMatchCache from '../../../../../src/v1/storage/cache/tournament/tournament.match.cache.js';
import TournamentPlayerCache from '../../../../../src/v1/storage/cache/tournament/tournament.player.cache.js';
import { FastifyBaseLogger } from 'fastify';

// Prisma의 Match 타입과 비슷하게 필요한 필드만 정의
type MatchLike = {
  id: number;
  round: number;
  player1Id?: number;
  player2Id?: number;
  player1Score?: number;
  player2Score?: number;
  status?: string;
  winnerId?: number;
};

describe('TournamentCache', () => {
  const tournamentId = 555;
  let cache: TournamentCache;

  beforeEach(async () => {
    // 매 테스트마다 Redis를 초기화
    await redis.flushdb();

    // Logger 모킹
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

    // 실제 Redis 인스턴스를 넘겨서 하위 캐시들도 테스트
    const metaCache = new TournamentMetaCache(redis);
    const matchCache = new TournamentMatchCache(redis);
    const playerCache = new TournamentPlayerCache(redis);

    cache = new TournamentCache(loggerMock, matchCache, metaCache, playerCache);
  });

  it('createTournament should initialize meta, matches, and players', async () => {
    const input = {
      tournamentId,
      mode: 'AUTO' as const,
      size: 8 as const,
      playerIds: [11, 22, 33],
      // 세 개의 매치를 서로 다른 라운드로 예시
      matches: [
        { id: 101, round: 1 } as MatchLike,
        { id: 102, round: 1 } as MatchLike,
        { id: 201, round: 2 } as MatchLike,
      ] as MatchLike[],
    };

    await cache.createTournament(input);

    // 1) 메타 정보 확인: hash "tournament:555:meta"
    const metaKey = `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:meta`;
    const metaRaw = await redis.hgetall(metaKey);
    expect(metaRaw.mode).toBe(input.mode);
    expect(Number(metaRaw.size)).toBe(input.size);

    // 1-1) 상태 키 "tournament:555:state" → IN_PROGRESS
    const stateKey = `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:state`;
    const state = await redis.get(stateKey);
    expect(state).toBe('IN_PROGRESS');

    // 1-2) currentRound 키 "tournament:555:currentRound" → size(8)
    const roundKey = `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:currentRound`;
    const currentRound = await redis.get(roundKey);
    expect(Number(currentRound)).toBe(input.size);

    // 2) 매치 정보 확인: 각 라운드별 Set membership
    // Round 1
    const round1Key = `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:matches:round:1`;
    const round1Members = (await redis.smembers(round1Key)).map(Number).sort((a, b) => a - b);
    expect(round1Members).toEqual([101, 102]);

    // Round 2
    const round2Key = `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:matches:round:2`;
    const round2Members = (await redis.smembers(round2Key)).map(Number);
    expect(round2Members).toEqual([201]);

    // 3) 플레이어 등록 확인: Set "tournament:555:players"
    const playersKey = `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:players`;
    const playerMembers = (await redis.smembers(playersKey)).map(Number).sort((a, b) => a - b);
    expect(playerMembers).toEqual(input.playerIds.sort((a, b) => a - b));

    // 4) 모든 관련 키에 TTL이 설정되었는지 확인
    const allKeys = await redis.keys(`${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:*`);
    expect(allKeys.length).toBeGreaterThan(0);
    for (const key of allKeys) {
      const ttl = await redis.ttl(key);
      expect(ttl).toBeGreaterThan(0);
    }
  });
});
