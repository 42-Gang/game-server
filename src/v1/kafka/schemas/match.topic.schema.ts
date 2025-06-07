import { z } from 'zod';
import { MATCH_EVENTS } from '../constants.js';

export const matchRequestMessageSchema = z.object({
  eventType: z.literal(MATCH_EVENTS.REQUEST),
  tournamentId: z.number(),
  matchId: z.number(),
  player1Id: z.number(),
  player2Id: z.number(),
  timestamp: z.string().datetime(),
});
