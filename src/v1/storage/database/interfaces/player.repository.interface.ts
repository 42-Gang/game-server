import { BaseRepositoryInterface } from './base.repository.interface.js';
import { Player, Prisma } from '../../../../../generated/client/index.js';

export interface PlayerRepositoryInterface
  extends BaseRepositoryInterface<Player, Prisma.PlayerCreateInput, Prisma.PlayerUpdateInput> {}
