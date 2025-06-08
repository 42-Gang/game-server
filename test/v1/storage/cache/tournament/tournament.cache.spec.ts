import { beforeEach, expect, it, describe, vi } from 'vitest';
import { redis } from '../../../../../src/plugins/redis.js';
import TournamentCache, {
  BASE_TOURNAMENT_KEY_PREFIX,
} from '../../../../../src/v1/storage/cache/tournament/tournament.cache.js';
import TournamentMetaCache from '../../../../../src/v1/storage/cache/tournament/tournament.meta.cache.js';
import TournamentMatchCache from '../../../../../src/v1/storage/cache/tournament/tournament.match.cache.js';
import TournamentPlayerCache from '../../../../../src/v1/storage/cache/tournament/tournament.player.cache.js';
import { FastifyBaseLogger } from 'fastify';
import UserServiceClient from '../../../../../src/v1/client/user.service.client.js';
import PlayerCache from '../../../../../src/v1/storage/cache/player.cache.js';

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
  tournamentId: number;
};

const tournamentId = 555;
let cache: TournamentCache;

beforeEach(async () => {
  await redis.flushdb();

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

  const metaCache = new TournamentMetaCache(redis);
  const matchCache = new TournamentMatchCache(redis);
  const tournamentPlayerCache = new TournamentPlayerCache(redis);
  const playerCache = new PlayerCache(redis);
  const userServiceClient = {
    getUserInfo: vi.fn((playerId: number) =>
      Promise.resolve({
        id: playerId,
        nickname: `user${playerId}`,
        avatarUrl: `http://avatar/${playerId}.png`,
      }),
    ),
  } as unknown as UserServiceClient;

  cache = new TournamentCache(
    loggerMock,
    matchCache,
    metaCache,
    tournamentPlayerCache,
    playerCache,
    userServiceClient,
  );
});

it('createTournament should initialize meta, matches, and players', async () => {
  const input = {
    tournamentId,
    mode: 'AUTO' as const,
    size: 2 as const,
    playerIds: [11, 22, 33],
    matches: [
      { tournamentId: 10, id: 101, round: 2 } as MatchLike,
      { tournamentId: 10, id: 102, round: 2 } as MatchLike,
      { tournamentId: 10, id: 201, round: 1 } as MatchLike,
    ] as MatchLike[],
  };

  await cache.createTournament(input);

  const metaKey = `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:meta`;
  const metaRaw = await redis.hgetall(metaKey);
  expect(metaRaw.mode).toBe(input.mode);
  expect(Number(metaRaw.size)).toBe(input.size);

  const stateKey = `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:state`;
  const state = await redis.get(stateKey);
  expect(state).toBe('IN_PROGRESS');

  const roundKey = `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:currentRound`;
  const currentRound = await redis.get(roundKey);
  expect(Number(currentRound)).toBe(input.size);

  const round2Key = `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:matches:round:2`;
  const round2Members = (await redis.smembers(round2Key)).map(Number).sort((a, b) => a - b);
  expect(round2Members).toEqual([101, 102]);

  const round1Key = `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:matches:round:1`;
  const round1Members = (await redis.smembers(round1Key)).map(Number);
  expect(round1Members).toEqual([201]);

  const playersKey = `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:players`;
  const playerMembers = (await redis.smembers(playersKey)).map(Number).sort((a, b) => a - b);
  expect(playerMembers).toEqual(input.playerIds.sort((a, b) => a - b));

  const allKeys = await redis.keys(`${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:*`);
  expect(allKeys.length).toBeGreaterThan(0);
  for (const key of allKeys) {
    expect(await redis.ttl(key)).toBeGreaterThan(0);
  }
});

describe('getTournamentInfo and getAllPlayerIds', () => {
  const input = {
    tournamentId,
    mode: 'CUSTOM' as const,
    size: 4 as const,
    playerIds: [5, 6, 7],
    matches: [{ tournamentId: 10, id: 301, round: 3 } as MatchLike] as MatchLike[],
  };

  beforeEach(async () => {
    await cache.createTournament(input);
  });

  it('getTournamentInfo should return full tournament info', async () => {
    const info = await cache.getTournamentInfo(tournamentId);
    expect(info).toEqual({
      meta: { mode: input.mode, size: input.size },
      currentRound: input.size,
      state: 'IN_PROGRESS',
    });
  });

  it('getAllPlayerIds should return all registered player IDs', async () => {
    const ids = await cache.getAllPlayerIds(tournamentId);
    expect(ids.sort((a, b) => a - b)).toEqual(input.playerIds.sort((a, b) => a - b));
  });
});
