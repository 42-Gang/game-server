import TournamentCache from '../../../storage/cache/tournament/tournament.cache.js';
import { Namespace, Socket } from 'socket.io';
import {
  broadcastAllUsersReadySchema,
  broadcastUserReadySchema,
  PlayerCacheSocketType,
  TOURNAMENT_SOCKET_EVENTS,
  tournamentInfoSchema,
  TournamentInfoType,
} from '../tournament.event.js';
import { FastifyBaseLogger } from 'fastify';
import TournamentPlayerCache from '../../../storage/cache/tournament/tournament.player.cache.js';
import PlayerCache from '../../../storage/cache/player.cache.js';

export default class TournamentSocketHandler {
  constructor(
    private readonly tournamentCache: TournamentCache,
    private readonly tournamentPlayerCache: TournamentPlayerCache,
    private readonly logger: FastifyBaseLogger,
    private readonly tournamentNamespace: Namespace,
    private readonly playerCache: PlayerCache,
  ) {}

  async sendTournamentInfo(socket: Socket) {
    const tournamentId = socket.data.tournamentId;
    this.logger.info(`Retrieving tournament info for tournament ID: ${tournamentId}`);

    if (!tournamentId) {
      socket.emit('error', { message: 'Tournament ID is required' });
      return;
    }

    const tournamentInfo = await this.tournamentCache.getTournamentInfo(tournamentId);
    this.logger.info(
      tournamentInfo,
      `Tournament info retrieved for tournament ID: ${tournamentId}`,
    );

    const playerIds = await this.tournamentPlayerCache.getAllPlayerIds(tournamentId);
    const players: PlayerCacheSocketType[] = await Promise.all(
      playerIds.map(async (playerId) => {
        const player = await this.playerCache.getPlayer(playerId);
        const state = await this.tournamentPlayerCache.getPlayerState(tournamentId, playerId);
        return {
          userId: player.id,
          nickname: player.nickname,
          profileImage: player.avatar,
          state,
        };
      }),
    );

    const message: TournamentInfoType = {
      mode: tournamentInfo.meta.mode,
      size: tournamentInfo.meta.size,
      players,
    };
    tournamentInfoSchema.parse(message);
    socket.emit(TOURNAMENT_SOCKET_EVENTS.MATCH_INFO, message);
  }

  async handleReady(socket: Socket) {
    const userId = socket.data.userId;
    const tournamentId = socket.data.tournamentId;

    this.logger.info(`User ${userId} is ready for tournament ${tournamentId}`);
    await this.tournamentPlayerCache.setPlayerReady(tournamentId, userId);
    this.broadcastUserReady(tournamentId, userId);

    if (await this.tournamentPlayerCache.areAllPlayersReady(tournamentId)) {
      this.logger.info(`All players are ready for tournament ${tournamentId}`);
      this.broadcastAllUsersReady(tournamentId);
      await this.tournamentPlayerCache.movePlayersToPlaying(tournamentId);
    }
  }

  private broadcastAllUsersReady(tournamentId: number) {
    const message = {
      type: 'all-users-ready',
    };
    broadcastAllUsersReadySchema.parse(message);
    this.tournamentNamespace
      .to(`tournament:${tournamentId}`)
      .emit(TOURNAMENT_SOCKET_EVENTS.READY, message);
  }

  private broadcastUserReady(tournamentId: number, userId: number) {
    const message = {
      type: 'user-ready',
      userId,
    };
    broadcastUserReadySchema.parse(message);
    this.tournamentNamespace
      .to(`tournament:${tournamentId}`)
      .emit(TOURNAMENT_SOCKET_EVENTS.READY, message);
  }
}
