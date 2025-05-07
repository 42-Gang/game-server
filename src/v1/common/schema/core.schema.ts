import { z } from 'zod';

import { STATUS } from '../constants/status.js';

// Common error schema
const errorSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
});

export const coreResponseSchema = z.object({
  status: z.nativeEnum(STATUS),
  message: z.string().optional(),
  errors: z.array(errorSchema).optional(),
});

// Common response schema factory
export const createResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  coreResponseSchema.extend({ data: dataSchema.optional() });
