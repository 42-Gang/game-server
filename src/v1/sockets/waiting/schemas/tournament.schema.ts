import { TypeOf, z } from 'zod';

export type tournamentSizeType = TypeOf<typeof tournamentSizeSchema>;

export const tournamentSizeSchema = z.union([z.literal(2), z.literal(4), z.literal(8)]);

export type tournamentModeType = TypeOf<typeof tournamentModeSchema>;

export const tournamentModeSchema = z.enum(['AUTO', 'CUSTOM']);
