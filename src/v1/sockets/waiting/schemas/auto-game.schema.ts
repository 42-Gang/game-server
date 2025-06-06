import { TypeOf, z } from 'zod';
import { tournamentSizeSchema } from './tournament.schema.js';

export type autoJoinSchemaType = TypeOf<typeof autoJoinSchema>;

export const autoJoinSchema = z.object({
  tournamentSize: tournamentSizeSchema,
});
