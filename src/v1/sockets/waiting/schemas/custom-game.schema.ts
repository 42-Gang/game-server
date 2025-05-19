import { TypeOf, z } from 'zod';
import { tournamentSizeSchema } from './tournament.schema.js';

export type customCreateType = TypeOf<typeof customCreateSchema>;

export const customCreateSchema = z.object({
  tournamentSize: tournamentSizeSchema,
});
