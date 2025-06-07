import { TypeOf, z } from 'zod';
import { Namespace } from 'socket.io';
import SocketCache from '../../storage/cache/socket.cache.js';
import { MATCH_EVENTS } from '../constants.js';

const participantSchema = z.object({
  userId: z.number(),
  username: z.string(),
});
type ParticipantType = TypeOf<typeof participantSchema>;
const handleMatchCreatedInputSchema = z.object({
  matchId: z.number(),
  serverInfo: z.object({
    serverName: z.string(),
  }),
  participants: z.array(participantSchema),
});
type HandleMatchCreatedInputType = TypeOf<typeof handleMatchCreatedInputSchema>;

const handleMatchResultInputSchema = z.object({});
type HandleMatchResultInputType = TypeOf<typeof handleMatchResultInputSchema>;

export default class MatchTopicService {
  constructor(
    private readonly tournamentNamespace: Namespace,
    private readonly socketCache: SocketCache,
  ) {}

  async handleMatchCreated(messageValue: HandleMatchCreatedInputType): Promise<void> {
    handleMatchCreatedInputSchema.parse(messageValue);

    const socketIds = await this.getSocketIds(messageValue.participants);
    for (const socketId of socketIds) {
      this.tournamentNamespace.to(socketId).emit(MATCH_EVENTS.CREATED, messageValue);
    }
  }

  private async getSocketIds(participants: ParticipantType[]) {
    return await Promise.all(
      participants.map(async (participant) => {
        const socketId = await this.socketCache.getSocketId({
          namespace: 'tournament',
          userId: participant.userId,
        });
        if (!socketId) {
          throw new Error(`Socket ID not found for userId: ${participant.userId}`);
        }
        return socketId;
      }),
    );
  }

  async handleMatchResult(messageValue: HandleMatchResultInputType): Promise<void> {
    handleMatchResultInputSchema.parse(messageValue);

    // TODO: 매치 결과 DB에 저장

    // TODO: 매치 결과(승패 및 점수 등) 해당 토너먼트에 참여한 유저들에게 전달
  }
}
