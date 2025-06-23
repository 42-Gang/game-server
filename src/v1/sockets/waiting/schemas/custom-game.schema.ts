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

export type customStartType = TypeOf<typeof customStartSchema>;

export const customStartSchema = z.object({
  roomId: z.string(),
});

export const inviteMessageSchema = z.object({
  roomId: z.string(),
  tournamentSize: tournamentSizeSchema,
  hostId: z.number(),
  hostName: z.string(),
  hostAvatarUrl: z.string().url(),
});

export type InviteMessageType = TypeOf<typeof inviteMessageSchema>;

export const roomUpdateUserSchema = z.object({
  id: z.number(),
  nickname: z.string(),
  avatarUrl: z.string().url(),
  isHost: z.boolean().default(false),
});
export type RoomUpdateUserType = TypeOf<typeof roomUpdateUserSchema>;

export const roomUpdateSchema = z.object({
  roomId: z.string().optional(),
  users: z.array(roomUpdateUserSchema),
});
export type RoomUpdateType = TypeOf<typeof roomUpdateSchema>;
