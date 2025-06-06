import TournamentCache from '../../../storage/cache/tournament/tournament.cache.js';
import { Socket } from 'socket.io';
import { TOURNAMENT_SOCKET_EVENTS } from '../tournament.event.js';
import { FastifyBaseLogger } from 'fastify';

export default class TournamentSocketHandler {
  constructor(
    private readonly tournamentCache: TournamentCache,
    private readonly logger: FastifyBaseLogger,
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
}
