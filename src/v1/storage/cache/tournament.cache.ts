import { Redis } from 'ioredis';
import { FastifyBaseLogger } from 'fastify';
import { tournamentSizeType } from '../../sockets/waiting/schemas/tournament.schema.js';

export default class TournamentCache {
  private readonly BASE_TOURNAMENT_KEY_PREFIX = 'tournament';

  constructor(
    private readonly redisClient: Redis,
    private readonly logger: FastifyBaseLogger,
  ) {}

  getMetaKey(tournamentId: number): string {
    return `${this.BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:meta`;
  }

  getPlayersKey(tournamentId: number): string {
    return `${this.BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:players`;
  }

  getMatchKey(tournamentId: number, matchId: number): string {
    return `${this.BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:match:${matchId}`;
  }

  getRoundStatusKey(tournamentId: number): string {
    return `${this.BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:round:status`;
  }

  getPlayerStatusKey(tournamentId: number, userId: number): string {
    return `${this.BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:players:${userId}:status`;
  }

  async createTournament(input: {
    tournamentId: number;
    mode: 'AUTO' | 'CUSTOM';
    playerIds: number[];
    size: tournamentSizeType;
  }): Promise<void> {
    this.logger.info(`Creating tournament ${input.tournamentId}`);

    const metaKey = this.getMetaKey(input.tournamentId);
    await this.redisClient.hset(metaKey, {
      id: input.tournamentId,
      mode: input.mode,
      size: input.size,
      playerIds: input.playerIds,
    });

    const playersKey = this.getPlayersKey(input.tournamentId);
    await this.redisClient.sadd(playersKey, input.playerIds);

    const roundStatusKey = this.getRoundStatusKey(input.tournamentId);
    await this.redisClient.hset(roundStatusKey, {
      ROUND_4: 'WAITING',
      ROUND_2: 'WAITING',
    });

    for (const playerId of input.playerIds) {
      const playerStatusKey = this.getPlayerStatusKey(input.tournamentId, playerId);
      await this.redisClient.set(playerStatusKey, 'WAITING');
    }
  }

  // TODO: 클래스 완성하기
}
