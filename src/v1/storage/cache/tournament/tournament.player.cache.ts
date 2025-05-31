import { BASE_TOURNAMENT_KEY_PREFIX, TOURNAMENT_TTL } from './tournament.cache.js';
import { Redis } from 'ioredis';
import { z } from 'zod';

const playerStateSchema = z.enum(['NOT_READY', 'READY', 'IN_GAME']);

export default class TournamentPlayerCache {
  constructor(private readonly redisClient: Redis) {}

  private getPlayersKey(tournamentId: number): string {
    return `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:players`;
  }

  private getPlayerKey(tournamentId: number, userId: number): string {
    return `${this.getPlayersKey(tournamentId)}:${userId}`;
  }

  private getPlayerStateKey(tournamentId: number, userId: number): string {
    return `${this.getPlayerKey(tournamentId, userId)}:status`;
  }

  private getActivePlayersKey(tournamentId: number): string {
    return `${this.getPlayersKey(tournamentId)}:active`;
  }

  private getReadyPlayersKey(tournamentId: number): string {
    return `${this.getPlayersKey(tournamentId)}:ready`;
  }

  private async initializePlayersState(playerIds: number[], tournamentId: number) {
    await Promise.all(
      playerIds.map((playerId) =>
        this.redisClient.set(
          this.getPlayerStateKey(tournamentId, playerId),
          playerStateSchema.enum.NOT_READY,
        ),
      ),
    );
  }

  private async addActivePlayers(tournamentId: number, playerIds: number[]) {
    await this.redisClient.sadd(this.getActivePlayersKey(tournamentId), playerIds);
  }

  private async addPlayers(tournamentId: number, playerIds: number[]) {
    const playersKey = this.getPlayersKey(tournamentId);
    await this.redisClient.sadd(playersKey, playerIds);
  }

  async registerPlayers(tournamentId: number, playerIds: number[]): Promise<void> {
    await this.addPlayers(tournamentId, playerIds);
    await this.addActivePlayers(tournamentId, playerIds);
    await this.initializePlayersState(playerIds, tournamentId);

    await this.redisClient.expire(`${this.getPlayersKey(tournamentId)}:*`, TOURNAMENT_TTL);
  }
}
