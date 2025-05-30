import { BASE_TOURNAMENT_KEY_PREFIX } from './tournament.cache.js';

export default class TournamentMatchCache {
  private getMatchesKey(tournamentId: number): string {
    return `${BASE_TOURNAMENT_KEY_PREFIX}:${tournamentId}:matches`;
  }

  private getMatchKey(tournamentId: number, matchId: number): string {
    return `${this.getMatchesKey(tournamentId)}:${matchId}`;
  }

  private getMatchesByRoundKey(tournamentId: number, round: number): string {
    return `${this.getMatchesKey(tournamentId)}:round:${round}`;
  }
}
