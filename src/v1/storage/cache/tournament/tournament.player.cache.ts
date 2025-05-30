import { BASE_TOURNAMENT_KEY_PREFIX } from './tournament.cache.js';

export default class TournamentPlayerCache {
  private getPlayersKey(tournamentId: number): string {
    return `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:players`;
  }

  private getPlayerKey(tournamentId: number, userId: number): string {
    return `${this.getPlayersKey(tournamentId)}:${userId}`;
  }

  private getPlayerStatusKey(tournamentId: number, userId: number): string {
    return `${this.getPlayerKey(tournamentId, userId)}:status`;
  }

  private getActivePlayersKey(tournamentId: number): string {
    return `${this.getPlayersKey(tournamentId)}:active`;
  }

  private getReadyPlayersKey(tournamentId: number): string {
    return `${this.getPlayersKey(tournamentId)}:ready`;
  }
}
