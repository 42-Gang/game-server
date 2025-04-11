import { Prisma, PrismaClient, User } from '@prisma/client';
import UserRepositoryInterface from '../interfaces/user.repository.interface.js';

export default class UserRepositoryPrisma implements UserRepositoryInterface {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  delete(id: number): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }

  findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  update(id: number, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }
}
