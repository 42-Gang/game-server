import TournamentRepositoryInterface from '../interfaces/tournament.repository.interface.js';
import { Prisma, PrismaClient, Tournament } from '@prisma/client';

export default class TournamentRepository implements TournamentRepositoryInterface {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Prisma.TournamentCreateInput, ts?: Prisma.TransactionClient): Promise<Tournament> {
    const client = ts || this.prisma;
    return client.tournament.create({ data });
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

  update(
    id: number,
    data: Prisma.TournamentUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Tournament> {
    const client = tx || this.prisma;
    return client.tournament.update({ where: { id }, data });
  }
}
