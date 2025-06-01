import { Redis } from 'ioredis';
import { FastifyBaseLogger } from 'fastify';
import { tournamentSizeType } from '../../../sockets/waiting/schemas/tournament.schema.js';
import TournamentMatchCache from './tournament.match.cache.js';
import TournamentMetaCache from './tournament.meta.cache.js';
import TournamentPlayerCache from './tournament.player.cache.js';
import { Match } from '@prisma/client';

export const BASE_TOURNAMENT_KEY_PREFIX = 'tournament';
export const TOURNAMENT_TTL = 60 * 30;

export default class TournamentCache {
  constructor(
    private readonly redisClient: Redis,
    private readonly logger: FastifyBaseLogger,
    private readonly tournamentMatchCache: TournamentMatchCache,
    private readonly tournamentMetaCache: TournamentMetaCache,
    private readonly tournamentPlayerCache: TournamentPlayerCache,
  ) {}

  async createTournament(input: {
    tournamentId: number;
    mode: 'AUTO' | 'CUSTOM';
    playerIds: number[];
    size: tournamentSizeType;
    matches: Match[];
  }): Promise<void> {
    this.logger.info(`Creating tournament ${input.tournamentId}`);

    await this.tournamentMetaCache.createTournamentMeta(input.tournamentId, {
      mode: input.mode,
      size: input.size,
    });
    input.matches.map((match) =>
      this.tournamentMatchCache.createMatch(input.tournamentId, match.id, match),
    );
    await this.tournamentPlayerCache.registerPlayers(input.tournamentId, input.playerIds);
  }
}
