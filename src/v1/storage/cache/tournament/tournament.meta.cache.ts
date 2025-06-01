import { BASE_TOURNAMENT_KEY_PREFIX, TOURNAMENT_TTL } from './tournament.cache.js';
import { Redis } from 'ioredis';
import { TypeOf, z } from 'zod';

export const tournamentStateSchema = z.enum(['IN_PROGRESS', 'FINISHED']);

export type tournamentMetaType = TypeOf<typeof tournamentMetaSchema>;
export const tournamentMetaSchema = z.object({
  mode: z.enum(['AUTO', 'CUSTOM']),
  size: z.number(),
});

export default class TournamentMetaCache {
  constructor(private readonly redisClient: Redis) {}

  private getTournamentKey(tournamentId: number): string {
    return `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}`;
  }

  private getTournamentMetaKey(tournamentId: number): string {
    return `${this.getTournamentKey(tournamentId)}:meta`;
  }

  private getTournamentStateKey(tournamentId: number): string {
    return `${this.getTournamentKey(tournamentId)}:state`;
  }

  private getTournamentCurrentRoundKey(tournamentId: number): string {
    return `${this.getTournamentKey(tournamentId)}:currentRound`;
  }

  private async initializeMeta(tournamentMetaKey: string, tournamentMeta: tournamentMetaType) {
    await this.redisClient.hset(tournamentMetaKey, tournamentMeta);
  }

  private async setTournamentCurrentRound(tournamentCurrentRoundKey: string, size: number) {
    await this.redisClient.set(tournamentCurrentRoundKey, size);
  }

  private async setTournamentState(tournamentStateKey: string) {
    await this.redisClient.set(tournamentStateKey, tournamentStateSchema.enum.IN_PROGRESS);
  }

  async createTournamentMeta(tournamentId: number, metaData: tournamentMetaType): Promise<void> {
    const tournamentMetaKey = this.getTournamentMetaKey(tournamentId);
    const tournamentStateKey = this.getTournamentStateKey(tournamentId);
    const tournamentCurrentRoundKey = this.getTournamentCurrentRoundKey(tournamentId);

    await this.initializeMeta(tournamentMetaKey, metaData);
    await this.setTournamentState(tournamentStateKey);
    await this.setTournamentCurrentRound(tournamentCurrentRoundKey, metaData.size);

    await this.refreshTTL(tournamentId);
  }

  private async refreshTTL(tournamentId: number) {
    const baseKey = this.getTournamentKey(tournamentId);
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
