import { Redis } from 'ioredis';
import { FastifyBaseLogger } from 'fastify';
import { tournamentSizeType } from '../../../sockets/waiting/schemas/tournament.schema.js';

export const BASE_TOURNAMENT_KEY_PREFIX = 'tournament';
export const TOURNAMENT_TTL = 60 * 30;

export default class TournamentCache {
  constructor(
    private readonly redisClient: Redis,
    private readonly logger: FastifyBaseLogger,
  ) {}

  private getTournamentKey(tournamentId: number): string {
    return `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:meta`;
  }

  private getPlayersKey(tournamentId: number): string {
    return `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:players`;
  }

  private getRoundStatusKey(tournamentId: number): string {
    return `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:round:status`;
  }

  private getPlayerStatusKey(tournamentId: number, userId: number): string {
    return `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:players:${userId}:status`;
  }

  async createTournament(input: {
    tournamentId: number;
    mode: 'AUTO' | 'CUSTOM';
    playerIds: number[];
    size: tournamentSizeType;
  }): Promise<void> {
    this.logger.info(`Creating tournament ${input.tournamentId}`);

    await this.redisClient.hset(this.getTournamentKey(input.tournamentId), {
      mode: input.mode,
      size: input.size,
    });
    await this.redisClient.sadd(this.getPlayersKey(input.tournamentId), input.playerIds);
    await this.redisClient.hset(this.getRoundStatusKey(input.tournamentId), {
      ROUND_4: 'WAITING',
      ROUND_2: 'WAITING',
    });

    await this.redisClient.expire(`${this.getTournamentKey(input.tournamentId)}:*`, TOURNAMENT_TTL);

    for (const playerId of input.playerIds) {
      const playerStatusKey = this.getPlayerStatusKey(input.tournamentId, playerId);
      await this.redisClient.set(playerStatusKey, 'WAITING');
    }
  }

  // TODO: 클래스 완성하기
}
