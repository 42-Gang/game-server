import { Redis } from 'ioredis';
import { FastifyBaseLogger } from 'fastify';

interface Tournament {
  id: number;
  mode: string;
}

export default class TournamentCache {
  private readonly BASE_TOURNAMENT_KEY_PREFIX = 'tournament';

  constructor(
    private readonly redisClient: Redis,
    private readonly logger: FastifyBaseLogger,
  ) {}

  getMetaKey(tournamentId: number): string {
    return `${this.BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:meta`;
  }

  async createTournament(input: Tournament): Promise<void> {
    this.logger.info(`Creating tournament ${input.id}`);
    const key = this.getMetaKey(input.id);
    await this.redisClient.hset(key, {
      id: input.id,
      mode: input.mode,
      status: 'WAITING',
    });
  }

  create() {}

  // TODO: 클래스 완성하기
}
