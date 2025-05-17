import { BaseRepositoryInterface } from './base.repository.interface.js';
import { Match, Prisma } from '@prisma/client';

export default interface MatchRepositoryInterface
  extends BaseRepositoryInterface<Match, Prisma.MatchCreateInput, Prisma.MatchUpdateInput> {
  findManyByTournamentIdAndRound(
    tournamentId: number,
    round: number,
    tx?: Prisma.TransactionClient,
  ): Promise<Match[]>;
}
