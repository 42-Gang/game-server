import { TypeOf, z } from 'zod';
import { Namespace } from 'socket.io';
import SocketCache from '../../storage/cache/socket.cache.js';
import { TOURNAMENT_SOCKET_EVENTS } from '../../sockets/tournament/tournament.event.js';

const handleMatchCreatedInputSchema = z.object({
  tournamentId: z.number(),
  matchId: z.number(),
  serverInfo: z.object({
    serverName: z.string(),
  }),
  player1Id: z.number(),
  player2Id: z.number(),
});
type HandleMatchCreatedInputType = TypeOf<typeof handleMatchCreatedInputSchema>;

const handleMatchResultInputSchema = z.object({
  tournamentId: z.number(),
  matchId: z.number(),
  player1Id: z.number(),
  player2Id: z.number(),
  score: z.object({
    player1: z.number(),
    player2: z.number(),
  }),
  winnerId: z.number(),
  round: z.number(),
});
type HandleMatchResultInputType = TypeOf<typeof handleMatchResultInputSchema>;

export default class MatchTopicService {
  constructor(
    private readonly tournamentNamespace: Namespace,
    private readonly socketCache: SocketCache,
  ) {}

  async handleMatchCreated(messageValue: HandleMatchCreatedInputType): Promise<void> {
    handleMatchCreatedInputSchema.parse(messageValue);

    const socketIds = await this.getSocketIds([messageValue.player1Id, messageValue.player2Id]);
    for (const socketId of socketIds) {
      this.tournamentNamespace.to(socketId).emit(TOURNAMENT_SOCKET_EVENTS.MATCH_INFO, messageValue);
    }
  }

  async handleMatchResult(messageValue: HandleMatchResultInputType): Promise<void> {
    handleMatchResultInputSchema.parse(messageValue);

    // TODO: 매치 결과 DB에 저장

    this.tournamentNamespace
      .to(`tournament:${messageValue.tournamentId}`)
      .emit(TOURNAMENT_SOCKET_EVENTS.GAME_RESULT, messageValue);
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
