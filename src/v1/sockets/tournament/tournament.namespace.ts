import { Namespace, Socket } from 'socket.io';
import { socketMiddleware } from '../utils/middleware.js';
import SocketCache from '../../storage/cache/socket.cache.js';
import { tournamentMiddleware } from './tournament.middleware.js';
import { TOURNAMENT_SOCKET_EVENTS } from './tournament.event.js';
import TournamentSocketHandler from './handlers/tournament.socket.handler.js';

export function startTournamentNamespace(namespace: Namespace) {
  namespace.use(socketMiddleware);
  namespace.use(tournamentMiddleware);

  namespace.on('connection', async (socket: Socket) => {
    const socketCache: SocketCache = namespace.server.diContainer.resolve('socketCache');
    const tournamentSocketHandler: TournamentSocketHandler =
      namespace.server.diContainer.resolve('tournamentSocketHandler');
    const logger = namespace.server.logger;
    const userId = socket.data.userId;
    const tournamentId = socket.data.tournamentId;

    await socketCache.setSocketId({
      namespace: 'tournament',
      socketId: socket.id,
      userId: userId,
    });
    socket.join(`tournament:${tournamentId}`);

    logger.info(`🟢 [/tournament] Connected: ${socket.id} ${userId}`);
    await tournamentSocketHandler.sendTournamentInfo(socket);

    socket.on(TOURNAMENT_SOCKET_EVENTS.READY, async () => {
      logger.info(`🟢 [/tournament] User ${userId} is ready`);
      await tournamentSocketHandler.handleReady(socket);
    });

    socket.on('disconnect', () => {
      logger.info(`🔴 [/waiting] Disconnected: ${socket.id}`);
      socketCache.deleteSocketId({
        namespace: 'waiting',
        userId: userId,
      });
    });
  });
}
