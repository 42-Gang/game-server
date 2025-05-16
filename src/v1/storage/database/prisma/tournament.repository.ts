import TournamentRepositoryInterface from '../interfaces/tournament.repository.interface.js';
import { Prisma, PrismaClient, Tournament } from '@prisma/client';

export default class TournamentRepository implements TournamentRepositoryInterface {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Prisma.TournamentCreateInput): Promise<Tournament> {
    return this.prisma.tournament.create({ data });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.tournament.delete({ where: { id } });
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
