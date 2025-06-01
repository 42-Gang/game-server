import { FastifyBaseLogger } from 'fastify';
import {
  tournamentSizeSchema,
  tournamentSizeType,
} from '../../../sockets/waiting/schemas/tournament.schema.js';
import TournamentMatchCache from './tournament.match.cache.js';
import TournamentMetaCache from './tournament.meta.cache.js';
import TournamentPlayerCache from './tournament.player.cache.js';
import { Match } from '@prisma/client';
import { TypeOf, z } from 'zod';

export const BASE_TOURNAMENT_KEY_PREFIX = 'tournament';
export const TOURNAMENT_TTL = 60 * 30;

const matchSchema = z.object({
  id: z.number(),
  round: z.number(),
  player1Id: z.number().nullable(),
  player2Id: z.number().nullable(),
  player1Score: z.number().nullable(),
  player2Score: z.number().nullable(),
  status: z.string().nullable(),
  winnerId: z.number().nullable(),
});

export type createTournamentType = TypeOf<typeof createTournamentSchema>;

export const createTournamentSchema = z.object({
  tournamentId: z.number(),
  mode: z.enum(['AUTO', 'CUSTOM']),
  playerIds: z.array(z.number()),
  size: tournamentSizeSchema,
  matches: z.array(matchSchema),
});

export default class TournamentCache {
  constructor(
    private readonly logger: FastifyBaseLogger,
    private readonly tournamentMatchCache: TournamentMatchCache,
    private readonly tournamentMetaCache: TournamentMetaCache,
    private readonly tournamentPlayerCache: TournamentPlayerCache,
  ) {}

  async createTournament(input: createTournamentType): Promise<void> {
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
