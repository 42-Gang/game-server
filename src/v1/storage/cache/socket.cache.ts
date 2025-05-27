import { Redis } from 'ioredis';

export default class SocketCache {
  constructor(private readonly redisClient: Redis) {}

  private getKey(namespace: string, userId: number): string {
    return `socket:${namespace}:${userId}`;
  }

  async setSocketId(input: { userId: number; socketId: string; namespace: string }): Promise<void> {
    const key = this.getKey(input.namespace, input.userId);
    await this.redisClient.set(key, input.socketId, 'EX', 3600);
  }

  async getSocketId(input: { userId: number; namespace: string }): Promise<string | null> {
    const key = this.getKey(input.namespace, input.userId);
    return await this.redisClient.get(key);
  }

  async deleteSocketId(input: { userId: number; namespace: string }): Promise<void> {
    const key = this.getKey(input.namespace, input.userId);
    await this.redisClient.del(key);
  }
}
