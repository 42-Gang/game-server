import { Socket } from 'socket.io';
import WaitingQueueCache from '../../../storage/cache/waiting.queue.cache.js';
import { FastifyBaseLogger } from 'fastify';
import CustomRoomCache from '../../../storage/cache/custom.room.cache.js';

export default class WaitingSocketHandler {
  constructor(
    private readonly waitingQueueCache: WaitingQueueCache,
    private readonly customRoomCache: CustomRoomCache,
    private readonly logger: FastifyBaseLogger,
  ) {}

  async leaveRoom(socket: Socket) {
    this.logger.info(`User ${socket.data.userId} left waiting room`);
    for (const tournamentSize of [2, 4, 8, 16]) {
      this.waitingQueueCache.removeUser(tournamentSize, socket.data.userId);
    }
    this.customRoomCache.disconnectedUser(socket.data.userId);
  }
}
