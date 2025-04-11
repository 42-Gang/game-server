import { User } from '@prisma/client';
import { UserCacheInterface } from '../interfaces/user.cache.interface.js';
import { FastifyRedis } from '@fastify/redis';

export default class UserCacheRedis implements UserCacheInterface {
  constructor(private readonly redisClient: FastifyRedis) {}

  private getKey(userId: number): string {
    return `user:${userId}`;
  }

  async get(key: string): Promise<User | null> {
    const data = await this.redisClient.get(key);
    if (!data) return null;
    return JSON.parse(data);
  }

  async set(key: string, value: User, _ttlSeconds?: number): Promise<void> {
    await this.redisClient.set(key, JSON.stringify(value)); // 직렬화
  }

  async delete(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redisClient.exists(key)) === 1;
  }

  async getUserById(userId: number): Promise<User | null> {
    return this.get(this.getKey(userId));
  }

  async setUserById(userId: number, user: User, ttlSeconds?: number): Promise<void> {
    await this.set(this.getKey(userId), user, ttlSeconds);
  }

  async deleteUserById(userId: number): Promise<void> {
    await this.delete(this.getKey(userId));
  }
}
