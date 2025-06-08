import { beforeEach, describe, expect, it } from 'vitest';
import { redis } from '../../../../../src/plugins/redis.js';
import TournamentMatchCache from '../../../../../src/v1/storage/cache/tournament/tournament.match.cache.js';

// Prisma의 Match 타입을 그대로 사용할 수 없으므로, 필요한 필드만 정의
type MatchLike = {
  id: number;
  tournamentId: number;
  round: number;
  player1Id?: number;
  player2Id?: number;
  player1Score?: number;
  player2Score?: number;
  status?: string;
  winnerId?: number;
};

let cache: TournamentMatchCache;
const tournamentId = 1;
const baseMatchesKey = `tournament:${tournamentId}:matches`;

beforeEach(async () => {
  // 매 테스트마다 Redis를 초기화
  await redis.flushdb();
  cache = new TournamentMatchCache(redis);
});

describe('createMatch & getMatchesInRound', () => {
  it('should add a single match to the correct round set', async () => {
    const matchData: MatchLike = { id: 101, tournamentId: 10, round: 1 };
    await cache.createMatch(tournamentId, matchData.id, matchData as any);

    // 내부적으로 sadd 하는 키: "tournament:1:matches:round:1"
    const roundKey = `${baseMatchesKey}:round:1`;
    const members = await redis.smembers(roundKey);
    expect(members.map(Number)).toEqual([101]);
  });

  it('getMatchesInRound should return all match IDs in the given round', async () => {
    // 세 개의 매치를 서로 다른 라운드에 추가
    await cache.createMatch(tournamentId, 201, { id: 201, tournamentId: 10, round: 2 } as any);
    await cache.createMatch(tournamentId, 202, { id: 202, tournamentId: 10, round: 2 } as any);
    await cache.createMatch(tournamentId, 301, { id: 301, tournamentId: 10, round: 3 } as any);

    // Round 2 매치 조회
    const round2Matches = await cache.getMatchesInRound(tournamentId, 2);
    // Set이므로 순서는 보장되지 않지만, 두 개의 값이 들어 있어야 함
    expect(round2Matches.sort((a, b) => a - b)).toEqual([201, 202]);

    // Round 3 매치 조회
    const round3Matches = await cache.getMatchesInRound(tournamentId, 3);
    expect(round3Matches).toEqual([301]);
  });

  it('getMatchesInRound should return an empty array if no matches in that round', async () => {
    const emptyMatches = await cache.getMatchesInRound(tournamentId, 5);
    expect(emptyMatches).toEqual([]);
  });

  it('should isolate matches between different tournaments', async () => {
    // tournamentId=1에 match 401을 round=4로 추가
    await cache.createMatch(1, 401, { id: 401, tournamentId: 10, round: 4 } as any);
    // tournamentId=2에도 같은 matchId를 같은 라운드로 추가
    await cache.createMatch(2, 401, { id: 401, tournamentId: 10, round: 4 } as any);

    // tournament 1의 round 4
    const t1Round4 = await cache.getMatchesInRound(1, 4);
    expect(t1Round4).toEqual([401]);

    // tournament 2의 round 4
    const t2Round4 = await cache.getMatchesInRound(2, 4);
    expect(t2Round4).toEqual([401]);
  });
});
