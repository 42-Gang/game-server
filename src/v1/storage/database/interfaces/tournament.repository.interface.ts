import { Prisma, Tournament } from '../../../../../generated/client/index.js';
import { BaseRepositoryInterface } from './base.repository.interface.js';

export default interface TournamentRepositoryInterface
  extends BaseRepositoryInterface<
    Tournament,
    Prisma.TournamentCreateInput,
    Prisma.TournamentUpdateInput
  > {}
