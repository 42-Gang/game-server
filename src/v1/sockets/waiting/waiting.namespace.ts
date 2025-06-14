import { Namespace, Socket } from 'socket.io';
import { socketMiddleware } from '../utils/middleware.js';
import { socketErrorHandler } from '../utils/errorHandler.js';
import { autoJoinSchemaType } from './schemas/auto-game.schema.js';
import SocketCache from '../../storage/cache/socket.cache.js';
import { WAITING_SOCKET_EVENTS } from './waiting.event.js';
import { FastifyBaseLogger } from 'fastify';
import AutoSocketHandler from './handlers/auto.socket.handler.js';
import CustomSocketHandler from './handlers/custom.socket.handler.js';

function registerAutoEvents(socket: Socket, handler: AutoSocketHandler, logger: FastifyBaseLogger) {
  socket.on(
    WAITING_SOCKET_EVENTS.AUTO.JOIN,
    socketErrorHandler(socket, logger, (payload: autoJoinSchemaType) =>
      handler.joinAutoRoom(socket, payload),
    ),
  );
}

function registerCustomEvents(
  socket: Socket,
  handler: CustomSocketHandler,
  logger: FastifyBaseLogger,
) {
  socket.on(
    WAITING_SOCKET_EVENTS.CUSTOM.CREATE,
    socketErrorHandler(socket, logger, (payload) => handler.createCustomRoom(socket, payload)),
  );
  socket.on(
    WAITING_SOCKET_EVENTS.CUSTOM.INVITE,
    socketErrorHandler(socket, logger, (payload) => handler.inviteCustomRoom(socket, payload)),
  );
  socket.on(
    WAITING_SOCKET_EVENTS.CUSTOM.ACCEPT,
    socketErrorHandler(socket, logger, (payload) => handler.acceptCustomRoom(socket, payload)),
  );
  socket.on(
    WAITING_SOCKET_EVENTS.CUSTOM.START,
    socketErrorHandler(socket, logger, (payload) => handler.startCustomRoom(socket, payload)),
  );
  socket.on(
    WAITING_SOCKET_EVENTS.CUSTOM.LEAVE,
    socketErrorHandler(socket, logger, () => handler.leaveCustomRoom(socket)),
  );
}

export function startWaitingNamespace(namespace: Namespace) {
  namespace.use(socketMiddleware);

  namespace.on('connection', async (socket: Socket) => {
    const autoSocketHandler: AutoSocketHandler =
      namespace.server.diContainer.resolve('autoSocketHandler');
    const customSocketHandler: CustomSocketHandler =
      namespace.server.diContainer.resolve('customSocketHandler');
    const socketCache: SocketCache = namespace.server.diContainer.resolve('socketCache');
    const logger = namespace.server.logger;
    const userId = socket.data.userId;

    await socketCache.setSocketId({
      namespace: 'waiting',
      socketId: socket.id,
      userId: userId,
    });

    logger.info(`🟢 [/waiting] Connected: ${socket.id} ${userId}`);

    registerAutoEvents(socket, autoSocketHandler, logger);
    registerCustomEvents(socket, customSocketHandler, logger);

    socket.on('disconnect', () => {
      logger.info(`🔴 [/waiting] Disconnected: ${socket.id}`);
      socketCache.deleteSocketId({
        namespace: 'waiting',
        userId: userId,
      });
      customSocketHandler.leaveRoom(socket);
    });

    socket.on('error', (error: Error) => {
      logger.info(`Error in waiting namespace: ${error.message}`);
    });
  });
}
