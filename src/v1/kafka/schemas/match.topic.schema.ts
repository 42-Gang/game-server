import { z } from 'zod';

export const matchRequestMessageSchema = z.object({
  tournamentId: z.number(),
  matchId: z.number(),
  matchServerName: z.string(),
  player1Id: z.number(),
  player2Id: z.number(),
  timestamp: z.string().datetime(),
});

export const matchResultMessageSchema = z.object({
  matchId: z.number(),
  player1Id: z.number(),
  player2Id: z.number(),
  score: z.object({
    player1: z.number(),
    player2: z.number(),
  }),
  winnerId: z.number(),
  loserId: z.number(),
});
export type HandleMatchResultType = z.infer<typeof matchResultMessageSchema>;
