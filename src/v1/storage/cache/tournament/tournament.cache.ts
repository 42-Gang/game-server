import { FastifyBaseLogger } from 'fastify';
import TournamentMatchCache from './tournament.match.cache.js';
import TournamentMetaCache from './tournament.meta.cache.js';
import TournamentPlayerCache from './tournament.player.cache.js';
import PlayerCache from '../player.cache.js';
import UserServiceClient from '../../../client/user.service.client.js';
import { createTournamentType } from '../cache.schema.js';

export const BASE_TOURNAMENT_KEY_PREFIX = 'tournament';
export const TOURNAMENT_TTL = 60 * 30;

export default class TournamentCache {
  constructor(
    private readonly logger: FastifyBaseLogger,
    private readonly tournamentMatchCache: TournamentMatchCache,
    private readonly tournamentMetaCache: TournamentMetaCache,
    private readonly tournamentPlayerCache: TournamentPlayerCache,
    private readonly playerCache: PlayerCache,
    private readonly userServiceClient: UserServiceClient,
  ) {}

  async createTournament(input: createTournamentType): Promise<void> {
    this.logger.info(`Creating tournament ${input.tournamentId}`);

    await this.tournamentMetaCache.createTournamentMeta(input.tournamentId, {
      mode: input.mode,
      size: input.size,
    });
    input.matches.map((match) =>
      this.tournamentMatchCache.createMatch(input.tournamentId, match.id, match),
    );
    await this.tournamentPlayerCache.registerPlayers(input.tournamentId, input.playerIds);
    await this.fetchPlayersInfo(input.playerIds);
  }

  private async fetchPlayersInfo(playerIds: number[]) {
    for (const playerId of playerIds) {
      if (await this.playerCache.isExists(playerId)) continue;

      this.logger.info(`🟢 [/tournament] Fetching user info for ${playerId}`);
      const user = await this.userServiceClient.getUserInfo(playerId);
      await this.playerCache.setPlayer(playerId, {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatarUrl,
      });
    }
  }

  getTournamentInfo(tournamentId: number) {
    this.logger.info(`Retrieving tournament meta for ${tournamentId}`);
    return this.tournamentMetaCache.getTournamentInfo(tournamentId);
  }

  getAllPlayerIds(tournamentId: number) {
    this.logger.info(`Retrieving all player IDs for tournament ${tournamentId}`);
    return this.tournamentPlayerCache.getAllPlayerIds(tournamentId);
  }
}
