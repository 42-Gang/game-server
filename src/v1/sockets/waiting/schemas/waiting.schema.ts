import { z } from 'zod';

export const joinRoomSchema = z.object({
  roomId: z.string(),
});

export const messageSchema = z.object({
  roomId: z.string(),
  message: z.string(),
});
