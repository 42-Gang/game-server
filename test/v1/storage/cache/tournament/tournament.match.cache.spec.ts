import { beforeEach, describe, it, expect } from 'vitest';
import { redis } from '../../../../../src/plugins/redis.js';
import TournamentMatchCache from '../../../../../src/v1/storage/cache/tournament/tournament.match.cache.js';

let cache: TournamentMatchCache;
const tournamentId = 1;
const baseMatchesKey = `tournament:${tournamentId}:matches`;

beforeEach(async () => {
  await redis.flushdb();
  cache = new TournamentMatchCache(redis);
});

describe('createMatch and related behavior', () => {
  it('adds match without players correctly', async () => {
    const matchId = 100;
    await cache.createMatch(tournamentId, matchId, { id: matchId, tournamentId, round: 1 } as any);
    const rounds = await redis.smembers(`${baseMatchesKey}:round:1`);
    expect(rounds.map(Number)).toEqual([matchId]);
    // players set should be empty or not created
    const playerMembers = await redis.smembers(`${baseMatchesKey}:match:${matchId}:players`);
    expect(playerMembers).toEqual([]);
  });

  it('adds match with two players correctly', async () => {
    const matchId = 200;
    const p1 = 10;
    const p2 = 20;
    await cache.createMatch(tournamentId, matchId, {
      id: matchId,
      tournamentId,
      round: 2,
      player1Id: p1,
      player2Id: p2,
    } as any);
    // match in round
    const roundMatches = await redis.smembers(`${baseMatchesKey}:round:2`);
    expect(roundMatches.map(Number)).toEqual([matchId]);
    // players set
    const players = await cache.getPlayersInMatch(tournamentId, matchId);
    expect(players.sort((a, b) => a - b)).toEqual([p1, p2]);
  });
});

describe('getMatchesInRound utility', () => {
  it('returns empty array for no matches', async () => {
    const empty = await cache.getMatchesInRound(tournamentId, 5);
    expect(empty).toEqual([]);
  });

  it('isolates matches per tournament and round', async () => {
    await cache.createMatch(1, 300, { id: 300, tournamentId: 1, round: 3 } as any);
    await cache.createMatch(2, 300, { id: 300, tournamentId: 2, round: 3 } as any);
    const t1 = await cache.getMatchesInRound(1, 3);
    const t2 = await cache.getMatchesInRound(2, 3);
    expect(t1).toEqual([300]);
    expect(t2).toEqual([300]);
  });
});

describe('removeMatchInRound behavior', () => {
  it('removes match', async () => {
    const matchId = 400;
    await cache.createMatch(tournamentId, matchId, { id: matchId, tournamentId, round: 4 } as any);
    // ensure TTL after create
    const ttlBefore = await redis.ttl(`${baseMatchesKey}:round:4`);
    expect(ttlBefore).toBeGreaterThan(0);

    await cache.removeMatchInRound(tournamentId, 4, matchId);
    const exists = await redis.smembers(`${baseMatchesKey}:round:4`);
    expect(exists).toEqual([]);
  });

  it('removes match when present and updates TTL', async () => {
    const matchId = 400;
    await cache.createMatch(tournamentId, matchId, { id: matchId, tournamentId, round: 4 } as any);
    const ttlBefore = await redis.ttl(`${baseMatchesKey}:round:4`);
    expect(ttlBefore).toBeGreaterThan(0);

    await cache.removeMatchInRound(tournamentId, 4, matchId);
    const exists = await redis.smembers(`${baseMatchesKey}:round:4`);
    expect(exists).toEqual([]);

    // 존재하는 모든 키에 대해 TTL이 갱신됐는지 확인
    const keys = await redis.keys(`${baseMatchesKey}:*`);
    for (const key of keys) {
      expect(await redis.ttl(key)).toBeGreaterThan(0);
    }
  });

  it('throws error when removing non-existent match', async () => {
    await expect(cache.removeMatchInRound(tournamentId, 9, 999)).rejects.toThrow(
      `Match with ID 999 not found in round 9 for tournament ${tournamentId}`,
    );
  });
});

describe('isEmptyInRound utility', () => {
  it('returns true when no matches exist', async () => {
    expect(await cache.isEmptyInRound(tournamentId, 6)).toBe(true);
  });

  it('returns false when matches exist', async () => {
    await cache.createMatch(tournamentId, 500, { id: 500, tournamentId, round: 6 } as any);
    expect(await cache.isEmptyInRound(tournamentId, 6)).toBe(false);
  });
});
