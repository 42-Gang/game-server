import { Namespace, Socket } from 'socket.io';
import { customJoinSchemaType } from './schemas/custom-join.schema.js';
import { socketErrorHandler } from '../utils/errorHandler.js';
import { AUTO } from './waiting.event.js';

export function handleWaitingConnection(namespace: Namespace, socket: Socket) {
  const logger = namespace.server.logger;
  const userId = socket.data.userId;
  logger.info(`🟢 [/waiting] Connected: ${socket.id} ${userId}`);

  socket.on(
    AUTO.JOIN,
    socketErrorHandler(logger, (payload: customJoinSchemaType) => {
      logger.info(
        `🟢 [/waiting] ${socket.id}(${userId}) Auto Join: tournament size ${payload.tournamentSize}`,
      );
    }),
  );

  socket.on('disconnect', () => {
    logger.info(`🔴 [/waiting] Disconnected: ${socket.id}`);
  });

  socket.on('error', (error: Error) => {
    logger.info(`Error in waiting namespace: ${error.message}`);
  });
}
