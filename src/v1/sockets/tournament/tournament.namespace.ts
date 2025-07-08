import { Namespace, Socket } from 'socket.io';
import { socketMiddleware } from '../utils/middleware.js';
import SocketCache from '../../storage/cache/socket.cache.js';
import { tournamentMiddleware } from './tournament.middleware.js';
import { TOURNAMENT_SOCKET_EVENTS } from './tournament.event.js';
import TournamentSocketHandler from './handlers/tournament.socket.handler.js';
import { socketErrorHandler } from '../utils/errorHandler.js';

export function startTournamentNamespace(namespace: Namespace) {
  namespace.use(socketMiddleware);
  namespace.use(tournamentMiddleware);

  namespace.on('connection', async (socket: Socket) => {
    const diContainer = namespace.server.diContainer;

    const socketCache: SocketCache = diContainer.resolve('socketCache');
    const tournamentSocketHandler: TournamentSocketHandler =
      diContainer.resolve('tournamentSocketHandler');

    const logger = namespace.server.logger;
    const userId = socket.data.userId;
    const tournamentId = socket.data.tournamentId;

    try {
      await socketCache.setSocketId({
        namespace: 'tournament',
        socketId: socket.id,
        userId: userId,
      });
      await tournamentSocketHandler.sendBracket(socket);
      socket.join(`tournament:${tournamentId}`);
      await tournamentSocketHandler.sendTournamentInfo(socket);

      logger.info(`🟢 [/tournament] Connected: ${socket.id} ${userId}`);
    } catch (error) {
      logger.error(
        `Error during connection for socket ${socket.id} and user ${userId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return;
    }

    socket.on(
      TOURNAMENT_SOCKET_EVENTS.READY,
      socketErrorHandler(socket, logger, async () => {
        logger.info(`🟢 [/tournament] User ${userId} is ready`);
        await tournamentSocketHandler.handleReady(socket);
      }),
    );

    socket.on('disconnect', () => {
      logger.info(`🔴 [/waiting] Disconnected: ${socket.id}`);
      socketCache.deleteSocketId({
        namespace: 'tournament',
        userId: userId,
      });
    });
  });
}
