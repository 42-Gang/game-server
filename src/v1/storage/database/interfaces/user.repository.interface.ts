import { Prisma, User } from '@prisma/client';
import { BaseRepositoryInterface } from './base.repository.interface.js';

export default interface UserRepositoryInterface
  extends BaseRepositoryInterface<User, Prisma.UserCreateInput, Prisma.UserUpdateInput> {
  findByEmail(email: string): Promise<User | null>;
}
