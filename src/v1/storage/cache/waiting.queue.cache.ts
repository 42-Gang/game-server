import { Redis } from 'ioredis';
import { FastifyBaseLogger } from 'fastify';

export default class WaitingQueueCache {
  private readonly BASE_QUEUE_KEY_PREFIX = `waiting-queue`;

  constructor(
    private readonly redisClient: Redis,
    private readonly logger: FastifyBaseLogger,
  ) {}

  private getQueueKey(tournamentSize: number): string {
    return `${this.BASE_QUEUE_KEY_PREFIX}:${tournamentSize}`;
  }

  async addUser(tournamentSize: number, userId: number): Promise<void> {
    this.logger.info(`Adding user ${userId} to ${tournamentSize}size waiting queue`);
    const key = this.getQueueKey(tournamentSize);

    await this.redisClient.rpush(key, userId);
  }

  async isQueueReady(tournamentSize: number): Promise<boolean> {
    const queueLength = await this.getCurrentQueueSize(tournamentSize);
    return tournamentSize <= queueLength;
  }

  async getCurrentQueueSize(tournamentSize: number): Promise<number> {
    const key = this.getQueueKey(tournamentSize);

    const queueLength = await this.redisClient.llen(key);
    this.logger.info(`Current queue length: ${queueLength}`);
    return queueLength;
  }

  async popUsersForMatch(tournamentSize: number): Promise<number[]> {
    if (!(await this.isQueueReady(tournamentSize))) {
      throw new Error('Not enough users in the queue to start a game');
    }

    const key = this.getQueueKey(tournamentSize);

    const users: number[] = [];
    for (let i = 0; i < tournamentSize; i++) {
      const userId = await this.redisClient.lpop(key);
      if (!userId) throw new Error('No more users in the queue');
      users.push(Number(userId));
    }
    this.logger.info(`Popped users for game: ${users}`);
    return users;
  }

  async removeUser(tournamentSize: number, userId: number): Promise<void> {
    this.logger.info(`Removing user ${userId} from ${tournamentSize}size waiting queue`);
    const key = this.getQueueKey(tournamentSize);

    await this.redisClient.lrem(key, 0, userId);
  }

  async isUserInQueue(tournamentSize: number, userId: number): Promise<boolean> {
    this.logger.info(`Checking if user ${userId} is in ${tournamentSize}size waiting queue`);
    const key = this.getQueueKey(tournamentSize);

    const queueLength = await this.redisClient.llen(key);
    if (queueLength === 0) {
      return false;
    }

    const users = await this.redisClient.lrange(key, 0, queueLength - 1);
    return users.includes(userId.toString());
  }
}
