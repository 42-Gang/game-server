import { BASE_TOURNAMENT_KEY_PREFIX, TOURNAMENT_TTL } from './tournament.cache.js';
import { Redis } from 'ioredis';
import { TypeOf, z } from 'zod';

export const matchSchema = z.object({
  tournamentId: z.number().int(),
  id: z.number().int(),
  player1Id: z.number().int().nullable().optional(),
  player2Id: z.number().int().nullable().optional(),
  player1Score: z.number().int().nullable().optional(),
  player2Score: z.number().int().nullable().optional(),
  winner: z.number().int().nullable().optional(),
  round: z.number().int(),
});

export type matchType = TypeOf<typeof matchSchema>;

export default class TournamentMatchCache {
  constructor(private readonly redisClient: Redis) {}

  private getMatchesKey(tournamentId: number): string {
    return `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:matches`;
  }

  private getMatchesByRoundKey(tournamentId: number, round: number): string {
    return `${this.getMatchesKey(tournamentId)}:round:${round}`;
  }

  private getMatchPlayerKey(tournamentId: number, matchId: number): string {
    return `${this.getMatchesKey(tournamentId)}:match:${matchId}:players`;
  }

  private async addPlayers(
    tournamentId: number,
    matchId: number,
    playerIds: number[],
  ): Promise<void> {
    const matchPlayerKey = this.getMatchPlayerKey(tournamentId, matchId);
    await this.redisClient.sadd(matchPlayerKey, playerIds);
  }

  private async addMatch(tournamentId: number, round: number, matchId: number) {
    const matchesByRoundKey = this.getMatchesByRoundKey(tournamentId, round);
    await this.redisClient.sadd(matchesByRoundKey, matchId);
  }

  async createMatch(tournamentId: number, matchId: number, data: matchType): Promise<void> {
    const matchData = matchSchema.parse(data);
    await this.addMatch(tournamentId, matchData.round, matchId);

    if (matchData.player1Id != null && matchData.player2Id != null) {
      await this.addPlayers(tournamentId, matchId, [matchData.player1Id, matchData.player2Id]);
    }

    await this.refreshTTL(tournamentId);
  }

  async getMatchesInRound(tournamentId: number, round: number): Promise<number[]> {
    const matchesByRoundKey = this.getMatchesByRoundKey(tournamentId, round);
    const members = await this.redisClient.smembers(matchesByRoundKey);

    return members.map(Number);
  }

  async getPlayersInMatch(tournamentId: number, matchId: number): Promise<number[]> {
    const matchPlayerKey = this.getMatchPlayerKey(tournamentId, matchId);
    const players = await this.redisClient.smembers(matchPlayerKey);
    return players.map(Number);
  }

  async removeMatchInRound(tournamentId: number, round: number, matchId: number): Promise<void> {
    const matchesByRoundKey = this.getMatchesByRoundKey(tournamentId, round);
    if (!(await this.redisClient.srem(matchesByRoundKey, matchId))) {
      throw new Error(
        `Match with ID ${matchId} not found in round ${round} for tournament ${tournamentId}`,
      );
    }

    await this.refreshTTL(tournamentId);
  }

  async isEmptyInRound(tournamentId: number, round: number): Promise<boolean> {
    const matchesByRoundKey = this.getMatchesByRoundKey(tournamentId, round);
    const count = await this.redisClient.scard(matchesByRoundKey);
    return count === 0;
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
