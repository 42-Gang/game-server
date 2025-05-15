import { TypeOf, z } from 'zod';

export type customJoinSchemaType = TypeOf<typeof customJoinSchema>;

export const customJoinSchema = z.object({
  tournamentSize: z.union([z.literal(2), z.literal(4), z.literal(8)]),
});
