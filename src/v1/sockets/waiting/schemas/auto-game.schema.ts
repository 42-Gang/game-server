import { TypeOf, z } from 'zod';
import { tournamentSizeSchema } from './tournament.schema.js';

export type customJoinSchemaType = TypeOf<typeof autoGameSchema>;

export const autoGameSchema = z.object({
  tournamentSize: tournamentSizeSchema,
});
