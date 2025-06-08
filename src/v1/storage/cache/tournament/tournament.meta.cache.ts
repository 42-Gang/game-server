import { BASE_TOURNAMENT_KEY_PREFIX, TOURNAMENT_TTL } from './tournament.cache.js';
import { Redis } from 'ioredis';
import { TypeOf, z } from 'zod';

export type tournamentStateType = TypeOf<typeof tournamentStateSchema>;
export const tournamentStateSchema = z.enum(['IN_PROGRESS', 'FINISHED']);

export type tournamentMetaType = TypeOf<typeof tournamentMetaSchema>;
export const tournamentMetaSchema = z.object({
  mode: z.enum(['AUTO', 'CUSTOM']),
  size: z.number(),
});

export type tournamentInfoType = TypeOf<typeof tournamentInfoSchema>;
export const tournamentInfoSchema = z.object({
  meta: tournamentMetaSchema,
  currentRound: z.number(),
  state: tournamentStateSchema,
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

  private async initializeMeta(tournamentId: number, tournamentMeta: tournamentMetaType) {
    const tournamentMetaKey = this.getTournamentMetaKey(tournamentId);
    await this.redisClient.hset(tournamentMetaKey, tournamentMeta);
  }

  private async getTournamentMeta(tournamentId: number): Promise<tournamentMetaType> {
    const tournamentMetaKey = this.getTournamentMetaKey(tournamentId);
    const meta = await this.redisClient.hgetall(tournamentMetaKey);
    if (Object.keys(meta).length === 0) {
      throw new Error(`Tournament meta not found for tournament ${tournamentId}`);
    }
    return {
      mode: meta.mode as 'AUTO' | 'CUSTOM',
      size: parseInt(meta.size, 10),
    };
  }

  private async setTournamentCurrentRound(tournamentId: number, size: number) {
    const tournamentCurrentRoundKey = this.getTournamentCurrentRoundKey(tournamentId);
    await this.redisClient.set(tournamentCurrentRoundKey, size);
  }

  private async getTournamentCurrentRound(tournamentId: number): Promise<number> {
    const key = this.getTournamentCurrentRoundKey(tournamentId);
    const currentRound = await this.redisClient.get(key);
    if (currentRound === null) {
      throw new Error(`Current round not found for tournament ${tournamentId}`);
    }
    return parseInt(currentRound, 10);
  }

  private async setTournamentState(tournamentId: number, state: tournamentStateType) {
    const tournamentStateKey = this.getTournamentStateKey(tournamentId);
    await this.redisClient.set(tournamentStateKey, state);
  }

  private async getTournamentState(tournamentId: number): Promise<tournamentStateType> {
    const key = this.getTournamentStateKey(tournamentId);
    const state = await this.redisClient.get(key);
    if (state === null) {
      throw new Error(`Tournament state not found for tournament ${tournamentId}`);
    }
    return tournamentStateSchema.parse(state);
  }

  async createTournamentMeta(tournamentId: number, metaData: tournamentMetaType): Promise<void> {
    await this.initializeMeta(tournamentId, metaData);
    await this.setTournamentState(tournamentId, tournamentStateSchema.enum.IN_PROGRESS);
    await this.setTournamentCurrentRound(tournamentId, metaData.size);

    await this.refreshTTL(tournamentId);
  }

  async getTournamentInfo(tournamentId: number): Promise<tournamentInfoType> {
    const meta = await this.getTournamentMeta(tournamentId);
    const currentRound = await this.getTournamentCurrentRound(tournamentId);
    const state = await this.getTournamentState(tournamentId);

    return {
      meta,
      currentRound,
      state,
    };
  }

  async getCurrentRound(tournamentId: number): Promise<number> {
    return this.getTournamentCurrentRound(tournamentId);
  }

  async isFinished(tournamentId: number): Promise<boolean> {
    const state = await this.getTournamentState(tournamentId);
    return state === tournamentStateSchema.enum.FINISHED;
  }

  async moveToNextRound(tournamentId: number): Promise<void> {
    const currentRound = await this.getTournamentCurrentRound(tournamentId);
    const nextRound = currentRound / 2;

    if (1 < nextRound) await this.setTournamentCurrentRound(tournamentId, nextRound);
    if (nextRound === 1)
      await this.setTournamentState(tournamentId, tournamentStateSchema.enum.FINISHED);
    await this.refreshTTL(tournamentId);
    return;
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
