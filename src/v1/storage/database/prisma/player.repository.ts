import { Prisma, PrismaClient, Player } from '@prisma/client';
import { PlayerRepositoryInterface } from '../interfaces/player.repository.interface.js';

export default class PlayerRepository implements PlayerRepositoryInterface {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Prisma.PlayerCreateInput, tx?: Prisma.TransactionClient): Promise<Player> {
    const client = tx || this.prisma;
    return client.player.create({ data });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.player.delete({ where: { id } });
  }

  findAll(): Promise<Player[]> {
    return this.prisma.player.findMany();
  }

  findById(id: number): Promise<Player | null> {
    return this.prisma.player.findUnique({ where: { id } });
  }

  update(id: number, data: Prisma.PlayerUpdateInput): Promise<Player> {
    return this.prisma.player.update({ where: { id }, data });
  }
}
