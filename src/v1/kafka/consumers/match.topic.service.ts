import { TypeOf, z } from 'zod';
import { Namespace } from 'socket.io';
import SocketCache from '../../storage/cache/socket.cache.js';
import { TOURNAMENT_SOCKET_EVENTS } from '../../sockets/tournament/tournament.event.js';
import TournamentPlayerCache from '../../storage/cache/tournament/tournament.player.cache.js';
import TournamentMatchCache from '../../storage/cache/tournament/tournament.match.cache.js';
import TournamentMetaCache from '../../storage/cache/tournament/tournament.meta.cache.js';
import { HandleMatchResultType, matchResultMessageSchema } from '../schemas/match.topic.schema.js';
import MatchRepository from '../../storage/database/prisma/match.repository.js';
import { FastifyBaseLogger } from 'fastify';

const handleMatchCreatedInputSchema = z.object({
  tournamentId: z.number(),
  matchId: z.number(),
  serverName: z.string(),
  player1Id: z.number(),
  player2Id: z.number(),
});
type HandleMatchCreatedInputType = TypeOf<typeof handleMatchCreatedInputSchema>;

export default class MatchTopicService {
  constructor(
    private readonly tournamentNamespace: Namespace,
    private readonly socketCache: SocketCache,
    private readonly tournamentPlayerCache: TournamentPlayerCache,
    private readonly tournamentMatchCache: TournamentMatchCache,
    private readonly tournamentMetaCache: TournamentMetaCache,
    private readonly matchRepository: MatchRepository,
    private readonly logger: FastifyBaseLogger,
  ) {}

  async handleMatchCreated(messageValue: HandleMatchCreatedInputType): Promise<void> {
    handleMatchCreatedInputSchema.parse(messageValue);

    const socketIds = await this.getSocketIds([messageValue.player1Id, messageValue.player2Id]);
    for (const socketId of socketIds) {
      this.tournamentNamespace.to(socketId).emit(TOURNAMENT_SOCKET_EVENTS.MATCH_INFO, messageValue);
    }
  }

  async handleMatchResult(messageValue: HandleMatchResultType): Promise<void> {
    matchResultMessageSchema.parse(messageValue);

    await this.matchRepository.update(messageValue.matchId, {
      player1Score: messageValue.score.player1,
      player2Score: messageValue.score.player2,
      winner: messageValue.winnerId,
      status: 'FINISHED',
    });

    const match = await this.matchRepository.findById(messageValue.matchId);
    if (!match) {
      throw new Error(`Match with ID ${messageValue.matchId} not found`);
    }
    const tournamentId = match.tournamentId;

    await this.tournamentPlayerCache.movePlayerToEliminated(tournamentId, messageValue.loserId);

    await this.tournamentMatchCache.removeMatchInRound(
      tournamentId,
      match.round,
      messageValue.matchId,
    );

    if (await this.tournamentMatchCache.isEmptyInRound(tournamentId, match.round)) {
      await this.tournamentMetaCache.moveToNextRound(tournamentId);
    }

    this.tournamentNamespace
      .to(`tournament:${tournamentId}`)
      .emit(TOURNAMENT_SOCKET_EVENTS.GAME_RESULT, messageValue);
    this.logger.info(`${tournamentId} tournament match result is sent:`, messageValue);

    if (await this.tournamentMetaCache.isFinished(tournamentId)) {
      this.tournamentNamespace
        .to(`tournament:${tournamentId}`)
        .emit(TOURNAMENT_SOCKET_EVENTS.FINISHED);
      this.logger.info(`Tournament ${tournamentId} has finished.`);
    }
  }

  private async getSocketIds(playerIds: number[]) {
    return await Promise.all(
      playerIds.map(async (playerId) => {
        const socketId = await this.socketCache.getSocketId({
          namespace: 'tournament',
          userId: playerId,
        });
        if (!socketId) {
          throw new Error(`Socket ID not found for userId: ${playerId}`);
        }
        return socketId;
      }),
    );
  }
}
