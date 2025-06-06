import TournamentCache from '../../../storage/cache/tournament/tournament.cache.js';
import { Socket } from 'socket.io';
import { TOURNAMENT_SOCKET_EVENTS } from '../tournament.event.js';

export default class TournamentSocketHandler {
  constructor(private readonly tournamentCache: TournamentCache) {}

  async sendTournamentInfo(socket: Socket) {
    const tournamentId = socket.data.tournamentId;
    if (!tournamentId) {
      socket.emit('error', { message: 'Tournament ID is required' });
      return;
    }

    const tournamentInfo = await this.tournamentCache.getTournamentInfo(tournamentId);
    socket.emit(TOURNAMENT_SOCKET_EVENTS.MATCH_INFO, tournamentInfo);
  }
}
