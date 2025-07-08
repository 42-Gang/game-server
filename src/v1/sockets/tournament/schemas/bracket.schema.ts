import { z } from 'zod';

export const matchSchema = z.object({
  matchId: z.number(),
  player1Id: z.number().nullable(),
  player2Id: z.number().nullable(),
  player1Score: z.number().nullable(),
  player2Score: z.number().nullable(),
  round: z.number(),
  status: z.enum(['NOT_STARTED', 'INPROGRESS', 'FINISHED']),
});

export type MatchType = z.infer<typeof matchSchema>;

export const bracketSchema = matchSchema.array();

export type BracketType = z.infer<typeof bracketSchema>;
