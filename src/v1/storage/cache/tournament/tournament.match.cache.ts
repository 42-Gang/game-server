import { BASE_TOURNAMENT_KEY_PREFIX, TOURNAMENT_TTL } from './tournament.cache.js';
import { Redis } from 'ioredis';
import { Match } from '@prisma/client';

export default class TournamentMatchCache {
  constructor(private readonly redisClient: Redis) {}

  private getMatchesKey(tournamentId: number): string {
    return `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:matches`;
  }

  private getMatchesByRoundKey(tournamentId: number, round: number): string {
    return `${this.getMatchesKey(tournamentId)}:round:${round}`;
  }

  async createMatch(tournamentId: number, matchId: number, matchData: Match): Promise<void> {
    const matchesByRoundKey = this.getMatchesByRoundKey(tournamentId, matchData.round);
    await this.redisClient.sadd(matchesByRoundKey, matchId);

    await this.refreshTTL(tournamentId);
  }

  async getMatchesInRound(tournamentId: number, round: number): Promise<number[]> {
    const matchesByRoundKey = this.getMatchesByRoundKey(tournamentId, round);
    const members = await this.redisClient.smembers(matchesByRoundKey);

    return members.map(Number);
  }

  private async refreshTTL(tournamentId: number) {
    const baseKey = this.getMatchesKey(tournamentId);
    const pattern = `${baseKey}:*`;

    // 부모 키에 먼저 TTL 설정
    const pipeline = this.redisClient.multi().expire(baseKey, TOURNAMENT_TTL);

    // 패턴에 맞는 하위 키 조회
    const childKeys = await this.redisClient.keys(pattern);
    childKeys.forEach((key) => {
      pipeline.expire(key, TOURNAMENT_TTL);
    });

    await pipeline.exec();
  }
}
