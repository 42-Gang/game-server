import { Redis } from 'ioredis';
import { FastifyBaseLogger } from 'fastify';

export default class WaitingQueueCache {
  private readonly WAITING_QUEUE = `waiting-queue`;

  constructor(
    private readonly redisClient: Redis,
    private readonly logger: FastifyBaseLogger,
    private readonly tournamentSize: number,
  ) {}

  getKey(tournamentSize: number): string {
    return `${this.WAITING_QUEUE}:${tournamentSize}`;
  }

  async addToQueue(tournamentSize: number, userId: number): Promise<void> {
    this.logger.info(`Adding user ${userId} to waiting queue`);
    const key = this.getKey(tournamentSize);

    await this.redisClient.rpush(key, userId);
  }

  getTournamentSize(): number {
    return this.tournamentSize;
  }

  async canStartGame(tournamentSize: number): Promise<boolean> {
    const queueLength = await this.getQueueLength(tournamentSize);
    return this.tournamentSize <= queueLength;
  }

  async getQueueLength(tournamentSize: number): Promise<number> {
    const key = this.getKey(tournamentSize);

    const queueLength = await this.redisClient.llen(key);
    this.logger.info(`Current queue length: ${queueLength}`);
    return queueLength;
  }

  async popForGame(tournamentSize: number): Promise<number[]> {
    if (!(await this.canStartGame(tournamentSize))) {
      throw new Error('Not enough users in the queue to start a game');
    }

    const key = this.getKey(tournamentSize);

    const users: number[] = [];
    for (let i = 0; i < this.tournamentSize; i++) {
      const userId = await this.redisClient.lpop(key);
      if (!userId) throw new Error('No more users in the queue');
      users.push(Number(userId));
    }
    this.logger.info(`Popped users for game: ${users}`);
    return users;
  }
}
