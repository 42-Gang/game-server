import { Namespace, Socket } from 'socket.io';
import { socketMiddleware } from '../utils/middleware.js';
import SocketCache from '../../storage/cache/socket.cache.js';
import { tournamentMiddleware } from './tournament.middleware.js';

export function startTournamentNamespace(namespace: Namespace) {
  namespace.use(socketMiddleware);
  namespace.use(tournamentMiddleware);

  namespace.on('connection', async (socket: Socket) => {
    const socketCache: SocketCache = namespace.server.diContainer.resolve('socketCache');
    const logger = namespace.server.logger;
    const userId = socket.data.userId;

    await socketCache.setSocketId({
      namespace: 'tournament',
      socketId: socket.id,
      userId: userId,
    });

    logger.info(`🟢 [/tournament] Connected: ${socket.id} ${userId}`);
  });
}
