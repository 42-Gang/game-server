import { Player, Prisma } from '@prisma/client';
import { BaseRepositoryInterface } from './base.repository.interface.js';

export interface PlayerRepositoryInterface
  extends BaseRepositoryInterface<Player, Prisma.PlayerCreateInput, Prisma.PlayerUpdateInput> {
  findManyByTournamentId(tournamentId: number): Promise<Player[]>;
}
