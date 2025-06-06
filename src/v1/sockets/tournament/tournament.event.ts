import { z } from 'zod';

export const TOURNAMENT_SOCKET_EVENTS = {
  READY: 'ready',
  MATCH_INFO: 'match-info',
  GAME_RESULT: 'game-result',
};

export const broadcastAllUsersReadySchema = z.object({
  type: z.literal('all-users-ready'),
});

export const broadcastUserReadySchema = z.object({
  type: z.literal('user-ready'),
  userId: z.number(),
});
