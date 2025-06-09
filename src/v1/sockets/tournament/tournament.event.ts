import { z } from 'zod';

export const TOURNAMENT_SOCKET_EVENTS = {
  READY: 'ready',
  MATCH_INFO: 'match-info',
  GAME_RESULT: 'game-result',
  FINISHED: 'finished',
};

export const playerCacheSocketSchema = z.object({
  userId: z.number(),
  nickname: z.string(),
  profileImage: z.string(),
  state: z.enum(['NOTHING', 'READY', 'PLAYING', 'ELIMINATED']),
});

export type PlayerCacheSocketType = z.infer<typeof playerCacheSocketSchema>;

export const tournamentInfoSchema = z.object({
  mode: z.enum(['AUTO', 'CUSTOM']),
  size: z.number(),
  players: z.array(playerCacheSocketSchema),
});

export type TournamentInfoType = z.infer<typeof tournamentInfoSchema>;

export const broadcastAllUsersReadySchema = z.object({
  type: z.literal('all-users-ready'),
});

export const broadcastUserReadySchema = z.object({
  type: z.literal('user-ready'),
  userId: z.number(),
});
