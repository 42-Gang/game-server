import { z } from 'zod';

import { STATUS } from '../constants/status.js';

// Common error schema
const errorSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
});

// Common response schema factory
export const createResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    status: z.nativeEnum(STATUS),
    message: z.string().optional(),
    data: dataSchema.optional(),
    errors: z.array(errorSchema).optional(),
  });
