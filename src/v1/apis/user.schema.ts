import { z } from 'zod';

export const getUserParamsSchema = z.object({
  id: z.preprocess((val) => Number(val), z.number()),
});
