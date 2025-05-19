import { TypeOf, z } from 'zod';
import { tournamentSizeSchema } from './tournament.schema.js';

export type customCreateType = TypeOf<typeof customCreateSchema>;

export const customCreateSchema = z.object({
  tournamentSize: tournamentSizeSchema,
});

export type customInviteType = TypeOf<typeof customInviteSchema>;

export const customInviteSchema = z.object({
  roomId: z.string(),
  userId: z.number(),
});
