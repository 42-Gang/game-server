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

export type customAcceptType = TypeOf<typeof customAcceptSchema>;

export const customAcceptSchema = z.object({
  roomId: z.string(),
});

export type customRoomInformationType = TypeOf<typeof customRoomInformationSchema>;

export const customRoomInformationSchema = z.object({
  roomId: z.string(),
  users: z.array(
    z.object({
      id: z.number(),
      nickname: z.string(),
      avatarUrl: z.string().url(),
    }),
  ),
});
