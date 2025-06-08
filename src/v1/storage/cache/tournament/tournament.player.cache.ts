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

  private async refreshTTL(tournamentId: number) {
    const baseKey = this.getPlayersKey(tournamentId);
    const pattern = `${baseKey}:*`;

    // 부모 키에 먼저 TTL 설정
    const pipeline = this.redisClient.multi().expire(baseKey, TOURNAMENT_TTL);

    // 패턴에 맞는 하위 키 조회
    const childKeys = await this.redisClient.keys(pattern);
    childKeys.forEach((key) => {
      pipeline.expire(key, TOURNAMENT_TTL);
    });

    await pipeline.exec();
  }

  async registerPlayers(tournamentId: number, playerIds: number[]): Promise<void> {
    await this.addPlayers(tournamentId, playerIds);

    await this.refreshTTL(tournamentId);
  }

  async setPlayerReady(tournamentId: number, userId: number): Promise<void> {
    if (!(await this.isActivePlayer(tournamentId, userId))) {
      throw new Error(`Player ${userId} is not an active player in tournament ${tournamentId}`);
    }

    await this.addPlayerInReady(tournamentId, userId);
    await this.refreshTTL(tournamentId);
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

    if (!(await this.areAllPlayersReady(tournamentId))) {
      throw new Error(`Not all players are ready for tournament ${tournamentId}`);
    }

    const readyPlayers = await this.getReadyPlayers(tournamentId);
    await this.redisClient
      .multi()
      .srem(readyPlayersKey, readyPlayers)
      .sadd(playingPlayersKey, readyPlayers)
      .exec();

    await this.refreshTTL(tournamentId);
  }

  async isUserParticipant(tournamentId: number, userId: number): Promise<boolean> {
    const playersId = await this.getPlayers(tournamentId);
    return playersId.includes(userId);
  }

  async eliminatePlayer(tournamentId: number, userId: number): Promise<void> {
    const eliminatedPlayersKey = this.getEliminatedPlayersKey(tournamentId);
    await this.redisClient.multi().sadd(eliminatedPlayersKey, userId).exec();

    await this.refreshTTL(tournamentId);
  }

  getAllPlayerIds(tournamentId: number) {
    return this.getPlayers(tournamentId);
  }

  private async isPlayerPlaying(tournamentId: number, userId: number): Promise<boolean> {
    return (
      (await this.redisClient.sismember(this.getPlayingPlayersKey(tournamentId), userId)) === 1
    );
  }

  async movePlayerToEliminated(tournamentId: number, userId: number): Promise<void> {
    if (!(await this.isActivePlayer(tournamentId, userId))) {
      throw new Error(`Player ${userId} is not an active player in tournament ${tournamentId}`);
    }
    if (!(await this.isPlayerPlaying(tournamentId, userId))) {
      throw new Error(`Player ${userId} is not currently playing in tournament ${tournamentId}`);
    }

    await this.eliminatePlayer(tournamentId, userId);
    await this.refreshTTL(tournamentId);
  }

  async getPlayerState(
    tournamentId: number,
    userId: number,
  ): Promise<'NOTHING' | 'READY' | 'PLAYING' | 'ELIMINATED'> {
    if (await this.redisClient.sismember(this.getReadyPlayersKey(tournamentId), userId)) {
      return 'READY';
    }
    if (await this.redisClient.sismember(this.getPlayingPlayersKey(tournamentId), userId)) {
      return 'PLAYING';
    }
    if (await this.redisClient.sismember(this.getEliminatedPlayersKey(tournamentId), userId)) {
      return 'ELIMINATED';
    }
    return 'NOTHING';
  }
}
