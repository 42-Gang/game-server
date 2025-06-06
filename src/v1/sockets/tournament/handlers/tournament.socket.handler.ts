import TournamentCache from '../../../storage/cache/tournament/tournament.cache.js';
import { Namespace, Socket } from 'socket.io';
import {
  broadcastAllUsersReadySchema,
  broadcastUserReadySchema,
  TOURNAMENT_SOCKET_EVENTS,
} from '../tournament.event.js';
import { FastifyBaseLogger } from 'fastify';
import TournamentPlayerCache from '../../../storage/cache/tournament/tournament.player.cache.js';

export default class TournamentSocketHandler {
  constructor(
    private readonly tournamentCache: TournamentCache,
    private readonly tournamentPlayerCache: TournamentPlayerCache,
    private readonly logger: FastifyBaseLogger,
    private readonly tournamentNamespace: Namespace,
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
    socket.emit(TOURNAMENT_SOCKET_EVENTS.MATCH_INFO, tournamentInfo);
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
