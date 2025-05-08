import { Prisma, PrismaClient, Tournament } from '@prisma/client';
import UserRepositoryInterface from '../interfaces/tournament.repository.interface.js';

export default class TournamentRepositoryPrisma implements UserRepositoryInterface {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Prisma.TournamentCreateInput): Promise<Tournament> {
    return this.prisma.tournament.create({ data });
  }

  delete(id: number): Promise<Tournament> {
    return this.prisma.tournament.delete({ where: { id } });
  }

  findAll(): Promise<Tournament[]> {
    return this.prisma.tournament.findMany();
  }

  findById(id: number): Promise<Tournament | null> {
    return this.prisma.tournament.findUnique({ where: { id } });
  }

  update(id: number, data: Prisma.TournamentUpdateInput): Promise<Tournament> {
    return this.prisma.tournament.update({ where: { id }, data });
  }
}
