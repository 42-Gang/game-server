import { BASE_TOURNAMENT_KEY_PREFIX, TOURNAMENT_TTL } from './tournament.cache.js';
import { Redis } from 'ioredis';

export default class TournamentPlayerCache {
  constructor(private readonly redisClient: Redis) {}

  private getPlayersKey(tournamentId: number): string {
    return `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:players`;
  }

  private getReadyPlayersKey(tournamentId: number): string {
    return `${this.getPlayersKey(tournamentId)}:ready`;
  }

  private getPlayingPlayersKey(tournamentId: number): string {
    return `${this.getPlayersKey(tournamentId)}:playing`;
  }

  private getEliminatedPlayersKey(tournamentId: number): string {
    return `${this.getPlayersKey(tournamentId)}:eliminated`;
  }

  private async addPlayers(tournamentId: number, playerIds: number[]) {
    const playersKey = this.getPlayersKey(tournamentId);
    await this.redisClient.sadd(playersKey, playerIds);
  }

  private async setExpire(tournamentId: number) {
    await this.redisClient.expire(`${this.getPlayersKey(tournamentId)}:*`, TOURNAMENT_TTL);
  }

  private async addPlayerInReady(tournamentId: number, userId: number) {
    const readyPlayersKey = this.getReadyPlayersKey(tournamentId);
    await this.redisClient.sadd(readyPlayersKey, userId);
  }

  private async isActivePlayer(tournamentId: number, userId: number): Promise<boolean> {
    if (await this.redisClient.sismember(this.getEliminatedPlayersKey(tournamentId), userId)) {
      return false;
    }
    return true;
  }

  async registerPlayers(tournamentId: number, playerIds: number[]): Promise<void> {
    await this.addPlayers(tournamentId, playerIds);

    await this.setExpire(tournamentId);
  }

  async setPlayerReady(tournamentId: number, userId: number): Promise<void> {
    if (!(await this.isActivePlayer(tournamentId, userId))) {
      throw new Error(`Player ${userId} is not an active player in tournament ${tournamentId}`);
    }

    await this.addPlayerInReady(tournamentId, userId);
    await this.setExpire(tournamentId);
  }

  private async getReadyPlayers(tournamentId: number): Promise<number[]> {
    const players = await this.redisClient.smembers(this.getReadyPlayersKey(tournamentId));
    return players.map(Number);
  }

  private async getEliminatedPlayers(tournamentId: number): Promise<number[]> {
    const players = await this.redisClient.smembers(this.getEliminatedPlayersKey(tournamentId));
    return players.map(Number);
  }

  private async getPlayers(tournamentId: number): Promise<number[]> {
    const players = await this.redisClient.smembers(this.getPlayersKey(tournamentId));
    return players.map(Number);
  }

  async areAllPlayersReady(tournamentId: number): Promise<boolean> {
    const readyPlayers = await this.getReadyPlayers(tournamentId);
    const eliminatedPlayers = await this.getEliminatedPlayers(tournamentId);
    const players = await this.getPlayers(tournamentId);

    const readyCount = readyPlayers.length;
    const activePlayersCount = players.length - eliminatedPlayers.length;

    return readyCount === activePlayersCount;
  }

  async movePlayersToPlaying(tournamentId: number): Promise<void> {
    const readyPlayersKey = this.getReadyPlayersKey(tournamentId);
    const playingPlayersKey = this.getPlayingPlayersKey(tournamentId);

    const readyPlayers = await this.getReadyPlayers(tournamentId);
    await this.redisClient
      .multi()
      .srem(readyPlayersKey, readyPlayers)
      .sadd(playingPlayersKey, readyPlayers)
      .exec();

    await this.refreshTTL(tournamentId);
  }

  async eliminatePlayer(tournamentId: number, userId: number): Promise<void> {
    const playersKey = this.getPlayersKey(tournamentId);
    const eliminatedPlayersKey = this.getEliminatedPlayersKey(tournamentId);

    await this.redisClient
      .multi()
      .srem(playersKey, userId)
      .sadd(eliminatedPlayersKey, userId)
      .exec();

    await this.refreshTTL(tournamentId);
  }

  private async refreshTTL(tournamentId: number) {
    await this.redisClient.expire(`${this.getPlayersKey(tournamentId)}:*`, TOURNAMENT_TTL);
  }
}
