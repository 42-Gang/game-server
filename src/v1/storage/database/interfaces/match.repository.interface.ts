import { BaseRepositoryInterface } from './base.repository.interface.js';
import { Match, Prisma } from '../../../../../generated/client/index.js';

export default interface MatchRepositoryInterface
  extends BaseRepositoryInterface<Match, Prisma.MatchCreateInput, Prisma.MatchUpdateInput> {}
