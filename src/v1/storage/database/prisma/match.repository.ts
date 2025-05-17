import { PrismaClient, Prisma, Match } from '@prisma/client';
import MatchRepositoryInterface from '../interfaces/match.repository.interface.js';

export default class MatchRepository implements MatchRepositoryInterface {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Prisma.MatchCreateInput, tx?: Prisma.TransactionClient): Promise<Match> {
    const client = tx || this.prisma;
    return client.match.create({ data });
  }

  create2(data: Prisma.MatchUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<Match> {
    const client = tx || this.prisma;
    return client.match.create({ data });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.match.delete({ where: { id } });
  }

  findAll(): Promise<Match[]> {
    return this.prisma.match.findMany();
  }

  findById(id: number): Promise<Match | null> {
    return this.prisma.match.findUnique({ where: { id } });
  }

  update(id: number, data: Prisma.MatchUpdateInput, tx?: Prisma.TransactionClient): Promise<Match> {
    const client = tx || this.prisma;
    return client.match.update({ where: { id }, data });
  }
}
