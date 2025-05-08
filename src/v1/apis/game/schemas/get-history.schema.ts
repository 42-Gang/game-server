import { z } from 'zod';

export const getHistoryParamsSchema = z.object({
    round: z.enum(["ROUND_2", "ROUND_4", "ROUND_8", "ROUND_16"]),
});

export const getHistoryResponseSchema = z.object({
  
});