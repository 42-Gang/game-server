import { createResponseSchema } from '../common/schema/core.schema.js';
import { z } from 'zod';

export const FindUserResponseSchema = createResponseSchema(
  z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
);
