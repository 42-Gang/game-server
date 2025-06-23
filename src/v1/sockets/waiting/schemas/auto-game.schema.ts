import { TypeOf, z } from 'zod';
import { tournamentSizeSchema } from './tournament.schema.js';

export const autoJoinSchema = z.object({
  tournamentSize: tournamentSizeSchema,
});

export type autoJoinSchemaType = TypeOf<typeof autoJoinSchema>;

export const autoLeaveSchema = z.object({
  tournamentSize: tournamentSizeSchema,
});

export type autoLeaveSchemaType = TypeOf<typeof autoLeaveSchema>;
