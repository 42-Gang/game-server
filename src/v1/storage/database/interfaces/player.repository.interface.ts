import { BaseRepositoryInterface } from './base.repository.interface.js';
import { Player, Prisma } from '@prisma/client';

export interface PlayerRepositoryInterface
  extends BaseRepositoryInterface<Player, Prisma.PlayerCreateInput, Prisma.PlayerUpdateInput> {}
