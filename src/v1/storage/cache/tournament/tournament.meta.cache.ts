import { BASE_TOURNAMENT_KEY_PREFIX } from './tournament.cache.js';

export default class TournamentMetaCache {
  private getTournamentKey(tournamentId: number): string {
    return `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}`;
  }

  private getTournamentMetaKey(tournamentId: number): string {
    return `${this.getTournamentKey(tournamentId)}:meta`;
  }

  private getTournamentStateKey(tournamentId: number): string {
    return `${this.getTournamentKey(tournamentId)}:state`;
  }

  private getTournamentCurrentRoundKey(tournamentId: number): string {
    return `${this.getTournamentKey(tournamentId)}:currentRound`;
  }
}
