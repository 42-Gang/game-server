import { Redis } from 'ioredis';
import { TypeOf, z } from 'zod';

export const BASE_PLAYER_KEY_PREFIX = `player`;
export const PLAYER_TTL = 60 * 30;

export type PlayerCacheType = TypeOf<typeof playerCacheSchema>;
export const playerCacheSchema = z.object({
  id: z.number(),
  nickname: z.string(),
  avatar: z.string().url(),
});

export default class PlayerCache {
  constructor(private readonly redisClient: Redis) {}

  private getPlayerKey(playerId: string): string {
    return `${BASE_PLAYER_KEY_PREFIX}:${playerId}`;
  }

  async isExists(playerId: string): Promise<boolean> {
    const playerKey = this.getPlayerKey(playerId);
    const exists = await this.redisClient.exists(playerKey);
    return exists === 1;
  }

  async setPlayer(playerId: string, data: PlayerCacheType): Promise<void> {
    const playerKey = this.getPlayerKey(playerId);

    await this.redisClient.hset(playerKey, data);
    await this.refreshTTL(playerKey);
  }

  private async refreshTTL(playerKey: string) {
    await this.redisClient.expire(playerKey, PLAYER_TTL);
  }
}
