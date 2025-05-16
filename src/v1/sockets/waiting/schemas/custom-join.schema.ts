import { TypeOf, z } from 'zod';
import { tournamentSizeSchema } from './tournament.schema.js';

export type customJoinSchemaType = TypeOf<typeof customJoinSchema>;

export const customJoinSchema = z.object({
  tournamentSize: tournamentSizeSchema,
});
