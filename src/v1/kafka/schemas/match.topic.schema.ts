import { z } from 'zod';

export const matchRequestMessageSchema = z.object({
  tournamentId: z.number(),
  matchId: z.number(),
  matchServerName: z.string(),
  player1Id: z.number(),
  player2Id: z.number(),
  timestamp: z.string().datetime(),
});
