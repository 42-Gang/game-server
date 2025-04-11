import { BaseCacheInterface } from './base.cache.interface.js';
import { User } from '@prisma/client';

export interface UserCacheInterface extends BaseCacheInterface<User> {
  getUserById(userId: number): Promise<User | null>;

  setUserById(userId: number, user: User, ttlSeconds?: number): Promise<void>;

  deleteUserById(userId: number): Promise<void>;
}
