import { z } from 'zod';

export const bracketSchema = z.object({
  id: z.number(),
  player1Id: z.number(),
  player2Id: z.number(),
  player1Score: z.number().nullable(),
  player2Score: z.number().nullable(),
  round: z.number(),
  status: z.enum(['NOT_STARTED', 'INPROGRESS', 'FINISHED']),
});

export const bracketsSchema = bracketSchema.array();
