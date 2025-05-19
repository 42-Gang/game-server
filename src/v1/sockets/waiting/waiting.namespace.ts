import { Namespace, Socket } from 'socket.io';
import { socketMiddleware } from '../utils/middleware.js';
import { socketErrorHandler } from '../utils/errorHandler.js';
import { autoJoinSchemaType } from './schemas/auto-game.schema.js';
import WaitingSocketHandler from './waiting.socket.handler.js';
import SocketCache from '../../storage/cache/socket.cache.js';
import { SOCKET_EVENTS } from './waiting.event.js';

function registerAutoEvents(socket: Socket, handler: WaitingSocketHandler, logger: any) {
  socket.on(
    SOCKET_EVENTS.AUTO.JOIN,
    socketErrorHandler(socket, logger, (payload: autoJoinSchemaType) =>
      handler.joinAutoRoom(socket, payload),
    ),
  );
}

function registerCustomEvents(socket: Socket, handler: WaitingSocketHandler, logger: any) {
  socket.on(
    SOCKET_EVENTS.CUSTOM.CREATE,
    socketErrorHandler(socket, logger, (payload) => handler.createCustomRoom(socket, payload)),
  );
  socket.on(
    SOCKET_EVENTS.CUSTOM.INVITE,
    socketErrorHandler(socket, logger, (payload) => handler.inviteCustomRoom(socket, payload)),
  );
  socket.on(
    SOCKET_EVENTS.CUSTOM.ACCEPT,
    socketErrorHandler(socket, logger, (payload) => handler.acceptCustomRoom(socket, payload)),
  );
}

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

    registerAutoEvents(socket, waitingSocketHandler, logger);
    registerCustomEvents(socket, waitingSocketHandler, logger);

    // TODO: 나가기 기능 추가

    socket.on('disconnect', () => {
      logger.info(`🔴 [/waiting] Disconnected: ${socket.id}`);
      waitingSocketHandler.leaveRoom(socket);
      socketCache.deleteSocketId({
        namespace: 'waiting',
        userId: userId,
      });
    });

    socket.on('error', (error: Error) => {
      logger.info(`Error in waiting namespace: ${error.message}`);
    });
  });
}
