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
