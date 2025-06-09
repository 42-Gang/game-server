import { Redis } from 'ioredis';
import { playerCacheSchema, PlayerCacheType } from './cache.schema.js';

export const BASE_PLAYER_KEY_PREFIX = `player`;
export const PLAYER_TTL = 60 * 30;

export default class PlayerCache {
  constructor(private readonly redisClient: Redis) {}

  private getPlayerKey(playerId: number): string {
    return `${BASE_PLAYER_KEY_PREFIX}:${playerId}`;
  }

  async isExists(playerId: number): Promise<boolean> {
    const playerKey = this.getPlayerKey(playerId);
    const exists = await this.redisClient.exists(playerKey);
    return exists === 1;
  }

  async setPlayer(playerId: number, data: PlayerCacheType): Promise<void> {
    const playerKey = this.getPlayerKey(playerId);
    playerCacheSchema.parse(data);

    await this.redisClient.set(playerKey, JSON.stringify(data));
    await this.refreshTTL(playerKey);
  }

  async getPlayer(playerId: number): Promise<PlayerCacheType> {
    const playerKey = this.getPlayerKey(playerId);
    const rawPlayerData = await this.redisClient.get(playerKey);
    if (!rawPlayerData) {
      throw new Error(`Player with ID ${playerId} not found in cache.`);
    }
    const playerData = JSON.parse(rawPlayerData);
    return playerCacheSchema.parse(playerData);
  }

  private async refreshTTL(playerKey: string) {
    await this.redisClient.expire(playerKey, PLAYER_TTL);
  }
}
