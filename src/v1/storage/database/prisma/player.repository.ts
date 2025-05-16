import { PlayerRepositoryInterface } from '../interfaces/player.repository.interface.js';
import { undefined } from 'zod';
import { PrismaClient, Prisma, Player } from '@prisma/client';

export default class PlayerRepository implements PlayerRepositoryInterface {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Prisma.PlayerCreateInput, tx?: PrismaClient): Promise<Player> {
    const client = tx || this.prisma;
    return await client.player.create({ data });
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
