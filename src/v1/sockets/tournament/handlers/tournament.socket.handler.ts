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
import TournamentMatchCache from '../../../storage/cache/tournament/tournament.match.cache.js';
import TournamentMetaCache from '../../../storage/cache/tournament/tournament.meta.cache.js';
import MatchServerCache from '../../../storage/cache/match-server.cache.js';
import { matchRequestProducer } from '../../../kafka/producers/match.producer.js';
import MatchRepository from '../../../storage/database/prisma/match.repository.js';
import { bracketSchema, MatchType } from '../schemas/bracket.schema.js';

export default class TournamentSocketHandler {
  constructor(
    private readonly tournamentCache: TournamentCache,
    private readonly tournamentPlayerCache: TournamentPlayerCache,
    private readonly tournamentMatchCache: TournamentMatchCache,
    private readonly tournamentMetaCache: TournamentMetaCache,
    private readonly tournamentNamespace: Namespace,
    private readonly matchServerCache: MatchServerCache,
    private readonly matchRepository: MatchRepository,
    private readonly playerCache: PlayerCache,
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
    const userId = parseInt(socket.data.userId);
    const tournamentId = parseInt(socket.data.tournamentId);

    this.logger.info(`User ${userId} is ready for tournament ${tournamentId}`);
    await this.tournamentPlayerCache.setPlayerReady(tournamentId, userId);
    this.broadcastUserReady(tournamentId, userId);

    if (!(await this.tournamentPlayerCache.areAllPlayersReady(tournamentId))) {
      return;
    }

    this.logger.info(`All players are ready for tournament ${tournamentId}`);
    this.broadcastAllUsersReady(tournamentId);
    await this.tournamentPlayerCache.movePlayersToPlaying(tournamentId);

    const currentRound = await this.tournamentMetaCache.getCurrentRound(tournamentId);
    const matchesInRound = await this.tournamentMatchCache.getMatchesInRound(
      tournamentId,
      currentRound,
    );
    const matchServer = await this.matchServerCache.getBestMatchServer();

    for (const matchId of matchesInRound) {
      const playerIds = await this.tournamentMatchCache.getPlayersInMatch(tournamentId, matchId);
      if (playerIds.length !== 2) {
        this.logger.warn(
          `Match ${matchId} in tournament ${tournamentId} does not have exactly 2 players.`,
        );
        throw new Error(
          `Match ${matchId} in tournament ${tournamentId} does not have exactly 2 players.`,
        );
      }
      await matchRequestProducer({
        tournamentId,
        matchId,
        player1Id: playerIds[0],
        player2Id: playerIds[1],
        matchServerName: matchServer.serverName,
      });
    }
  }

  async sendBracket(socket: Socket) {
    const userId = parseInt(socket.data.userId);
    const tournamentId = parseInt(socket.data.tournamentId);

    const matches = await this.matchRepository.findManyByTournamentId(tournamentId);

    const bracket = matches.map(
      (match): MatchType => ({
        matchId: match.id,
        player1Id: match.player1Id,
        player2Id: match.player2Id,
        player1Score: match.player1Score,
        player2Score: match.player2Score,
        round: match.round,
        status: match.status,
      }),
    );
    socket.emit(TOURNAMENT_SOCKET_EVENTS.BRACKET_UPDATED, bracketSchema.parse(bracket));
    this.logger.info(`Bracket sent to user ${userId} for tournament ${tournamentId}`, bracket);
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
