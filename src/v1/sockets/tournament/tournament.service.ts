import TournamentPlayerCache from '../../storage/cache/tournament/tournament.player.cache.js';

export default class TournamentService {
  constructor(private readonly tournamentPlayerCache: TournamentPlayerCache) {}

  async isUserParticipant(tournamentId: number, userId: number): Promise<boolean> {
    return this.tournamentPlayerCache.isUserParticipant(tournamentId, userId);
  }
}
