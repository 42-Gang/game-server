import { TypeOf, z } from 'zod';

export const tournamentSizeSchema = z.union([
  z.literal(2),
  z.literal(4),
  z.literal(8),
  z.literal(16),
]);

export type tournamentSizeType = TypeOf<typeof tournamentSizeSchema>;

export const tournamentModeSchema = z.enum(['AUTO', 'CUSTOM']);

export type tournamentModeType = TypeOf<typeof tournamentModeSchema>;
