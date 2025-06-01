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

    await this.redisClient.expire(`${this.getMatchesKey(tournamentId)}:*`, TOURNAMENT_TTL);
  }

  async getMatchesInRound(tournamentId: number, round: number): Promise<number[]> {
    const matchesByRoundKey = this.getMatchesByRoundKey(tournamentId, round);
    const members = await this.redisClient.smembers(matchesByRoundKey);

    return members.map(Number);
  }
}
