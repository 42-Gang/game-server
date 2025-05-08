import { Prisma, Tournament } from '@prisma/client';
import { BaseRepositoryInterface } from './base.repository.interface.js';

export default interface TournamentRepositoryInterface
  extends BaseRepositoryInterface<Tournament, Prisma.TournamentCreateInput, Prisma.TournamentUpdateInput> {
  
}
