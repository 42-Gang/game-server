import { Namespace, Socket } from 'socket.io';
import { socketMiddleware } from '../utils/middleware.js';
import { socketErrorHandler } from '../utils/errorHandler.js';
import { autoJoinSchemaType } from './schemas/auto-game.schema.js';
import WaitingSocketHandler from './waiting.socket.handler.js';
import SocketCache from '../../storage/cache/socket.cache.js';
import { SOCKET_EVENTS } from './waiting.event.js';

export function startWaitingNamespace(namespace: Namespace) {
  namespace.use(socketMiddleware);

  namespace.on('connection', async (socket: Socket) => {
    const waitingSocketHandler: WaitingSocketHandler =
      namespace.server.diContainer.resolve('waitingSocketHandler');
    const socketCache: SocketCache = namespace.server.diContainer.resolve('socketCache');

    const logger = namespace.server.logger;
    const userId = socket.data.userId;
    await socketCache.setSocketId({
      namespace: 'waiting',
      socketId: socket.id,
      userId: userId,
    });

    logger.info(`🟢 [/waiting] Connected: ${socket.id} ${userId}`);

    socket.on(
      SOCKET_EVENTS.AUTO.JOIN,
      socketErrorHandler(logger, (payload: autoJoinSchemaType) =>
        waitingSocketHandler.joinAutoRoom(socket, payload),
      ),
    );

    socket.on(
      SOCKET_EVENTS.CUSTOM.CREATE,
      socketErrorHandler(logger, (payload) =>
        waitingSocketHandler.createCustomRoom(socket, payload),
      ),
    );

    socket.on(
      SOCKET_EVENTS.CUSTOM.INVITE,
      socketErrorHandler(logger, (payload) =>
        waitingSocketHandler.inviteCustomRoom(socket, payload),
      ),
    );

    // TODO: 나가기 기능 추가

    socket.on('disconnect', () => {
      logger.info(`🔴 [/waiting] Disconnected: ${socket.id}`);
      waitingSocketHandler.leaveRoom(socket);
      socketCache.deleteSocketId({
        namespace: namespace.name,
        userId: userId,
      });
    });

    socket.on('error', (error: Error) => {
      logger.info(`Error in waiting namespace: ${error.message}`);
    });
  });
}
