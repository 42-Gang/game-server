import { BASE_TOURNAMENT_KEY_PREFIX, TOURNAMENT_TTL } from './tournament.cache.js';
import { TypeOf, z } from 'zod';
import { Redis } from 'ioredis';

export type matchDataType = TypeOf<typeof matchDataSchema>;

export const matchDataSchema = z.object({
  matchId: z.number(),
  round: z.number(),
  player1Id: z.number(),
  player2Id: z.number(),
  score1: z.number().optional(),
  score2: z.number().optional(),
  winnerId: z.number().optional(),
  status: z.enum(['WAITING', 'IN_PROGRESS', 'COMPLETED']),
});

export default class TournamentMatchCache {
  constructor(private readonly redisClient: Redis) {}

  private getMatchesKey(tournamentId: number): string {
    return `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:matches`;
  }

  private getMatchKey(tournamentId: number, matchId: number): string {
    return `${this.getMatchesKey(tournamentId)}:${matchId}`;
  }

  private getMatchesByRoundKey(tournamentId: number, round: number): string {
    return `${this.getMatchesKey(tournamentId)}:round:${round}`;
  }

  async createMatch(
    tournamentId: number,
    matchId: number,
    matchData: matchDataType,
  ): Promise<void> {
    const matchKey = this.getMatchKey(tournamentId, matchId);
    const matchesByRoundKey = this.getMatchesByRoundKey(tournamentId, matchData.round);

    await this.redisClient.hset(matchKey, matchData);
    await this.redisClient.sadd(matchesByRoundKey, matchId);

    await this.redisClient.expire(`${this.getMatchesKey(tournamentId)}:*`, TOURNAMENT_TTL);
  }
}
