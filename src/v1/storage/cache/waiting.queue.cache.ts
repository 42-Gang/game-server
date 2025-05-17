import { Redis } from 'ioredis';
import { FastifyBaseLogger } from 'fastify';

export default class WaitingQueueCache {
  private readonly waitingQueueRedisKey;

  constructor(
    private readonly redisClient: Redis,
    private readonly logger: FastifyBaseLogger,
    private readonly tournamentSize: number,
  ) {
    this.waitingQueueRedisKey = `waiting-queue:${this.tournamentSize}`;
  }

  async addToQueue(userId: number): Promise<void> {
    this.logger.info(`Adding user ${userId} to waiting queue`);
    await this.redisClient.rpush(this.waitingQueueRedisKey, userId);
  }

  getTournamentSize(): number {
    return this.tournamentSize;
  }

  async canStartGame(): Promise<boolean> {
    const queueLength = await this.getQueueLength();
    return this.tournamentSize <= queueLength;
  }

  async getQueueLength(): Promise<number> {
    const queueLength = await this.redisClient.llen(this.waitingQueueRedisKey);
    this.logger.info(`Current queue length: ${queueLength}`);
    return queueLength;
  }

  async popForGame(): Promise<number[]> {
    if (!(await this.canStartGame())) {
      throw new Error('Not enough users in the queue to start a game');
    }

    const users: number[] = [];
    for (let i = 0; i < this.tournamentSize; i++) {
      const userId = await this.redisClient.lpop(this.waitingQueueRedisKey);
      if (!userId) throw new Error('No more users in the queue');
      users.push(Number(userId));
    }
    this.logger.info(`Popped users for game: ${users}`);
    return users;
  }
}
