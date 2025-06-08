import { Redis } from 'ioredis';
import { matchServerInfoArraySchema, MatchServerInfoArrayType } from './cache.schema.js';

export default class MatchServerCache {
  constructor(private readonly redisClient: Redis) {}

  private async getMatchServerKeys() {
    return await this.redisClient.keys(`match-server:*`);
  }

  private getGameCountKey(serverId: string): string {
    return `match-server:${serverId}:game-count`;
  }

  private async getMatchServerGameCount(serverName: string): Promise<number> {
    const value = await this.redisClient.get(this.getGameCountKey(serverName));
    if (value === null) {
      return 0;
    }
    return Number(value);
  }

  public async getMatchServers(): Promise<MatchServerInfoArrayType> {
    const serverKeys = await this.getMatchServerKeys();
    if (serverKeys.length === 0) {
      return [];
    }

    const serverNames = await this.redisClient.mget(serverKeys);
    const serverInfos = Promise.all(
      serverNames.map(async (serverName) => {
        if (!serverName) {
          throw new Error('Invalid server name retrieved from Redis');
        }

        const count = await this.getMatchServerGameCount(serverName);
        return {
          serverName,
          gameCount: count,
        };
      }),
    );
    return matchServerInfoArraySchema.parse(await serverInfos);
  }

  public async getBestMatchServer() {
    const servers = await this.getMatchServers();
    if (servers.length === 0) {
      throw new Error('No match servers available');
    }

    return servers.reduce((best, curr) => (best.gameCount < curr.gameCount ? best : curr));
  }
}
