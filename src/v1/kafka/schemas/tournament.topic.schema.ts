import { TypeOf, z } from 'zod';
import {
  tournamentModeSchema,
  tournamentSizeSchema,
} from '../../sockets/waiting/schemas/tournament.schema.js';

export type requestTournamentMessageType = TypeOf<typeof requestTournamentMessageSchema>;

export const requestTournamentMessageSchema = z.object({
  players: z.array(z.number()),
  mode: tournamentModeSchema,
  size: tournamentSizeSchema,
  timestamp: z.string(),
});

export type createdTournamentMessageType = TypeOf<typeof createdTournamentMessageSchema>;

export const createdTournamentMessageSchema = z.object({
  tournamentId: z.number(),
  mode: tournamentModeSchema,
  size: tournamentSizeSchema,
  players: z.array(z.number()),
  timestamp: z.string(),
});
