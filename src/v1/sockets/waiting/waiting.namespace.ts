import { Namespace, Socket } from 'socket.io';
import { socketMiddleware } from '../utils/middleware.js';
import { AUTO } from './waiting.event.js';
import { socketErrorHandler } from '../utils/errorHandler.js';
import { customJoinSchemaType } from './schemas/custom-join.schema.js';
import WaitingSocketHandler from './waiting.socket.handler.js';

export function startWaitingNamespace(namespace: Namespace) {
  namespace.use(socketMiddleware);

  namespace.on('connection', (socket: Socket) => {
    const logger = namespace.server.logger;
    const userId = socket.data.userId;
    logger.info(`🟢 [/waiting] Connected: ${socket.id} ${userId}`);
    const waitingSocketHandler: WaitingSocketHandler =
      namespace.server.diContainer.resolve('waitingSocketHandler');

    socket.on(
      AUTO.JOIN,
      socketErrorHandler(logger, (payload: customJoinSchemaType) =>
        waitingSocketHandler.joinRoom(socket, payload),
      ),
    );

    socket.on('disconnect', () => {
      logger.info(`🔴 [/waiting] Disconnected: ${socket.id}`);
      waitingSocketHandler.leaveRoom(socket);
    });

    socket.on('error', (error: Error) => {
      logger.info(`Error in waiting namespace: ${error.message}`);
    });
  });
}
