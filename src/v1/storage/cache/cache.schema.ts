import { TypeOf, z } from 'zod';
import { tournamentSizeSchema } from '../../sockets/waiting/schemas/tournament.schema.js';

export const matchSchema = z.object({
  tournamentId: z.number().int(),
  id: z.number().int(),
  player1Id: z.number().int().nullable().optional(),
  player2Id: z.number().int().nullable().optional(),
  player1Score: z.number().int().nullable().optional(),
  player2Score: z.number().int().nullable().optional(),
  winner: z.number().int().nullable().optional(),
  round: z.number().int(),
});

export type matchType = TypeOf<typeof matchSchema>;

export const createTournamentSchema = z.object({
  tournamentId: z.number(),
  mode: z.enum(['AUTO', 'CUSTOM']),
  playerIds: z.array(z.number()),
  size: tournamentSizeSchema,
  matches: z.array(matchSchema),
});

export type createTournamentType = TypeOf<typeof createTournamentSchema>;

export type tournamentStateType = TypeOf<typeof tournamentStateSchema>;
export const tournamentStateSchema = z.enum(['IN_PROGRESS', 'FINISHED']);

export type tournamentMetaType = TypeOf<typeof tournamentMetaSchema>;
export const tournamentMetaSchema = z.object({
  mode: z.enum(['AUTO', 'CUSTOM']),
  size: z.number(),
});

export const matchServerInfoSchema = z.object({
  serverName: z.string(),
  gameCount: z.number().default(0),
});
export const matchServerInfoArraySchema = z.array(matchServerInfoSchema);
export type MatchServerInfoArrayType = TypeOf<typeof matchServerInfoArraySchema>;

export type PlayerCacheType = TypeOf<typeof playerCacheSchema>;
export const playerCacheSchema = z.object({
  id: z.number(),
  nickname: z.string(),
  avatar: z.string().url(),
});
