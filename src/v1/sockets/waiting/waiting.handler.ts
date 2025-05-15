import { Namespace, Socket } from 'socket.io';

export function handleWaitingConnection(namespace: Namespace, socket: Socket) {
  const logger = namespace.server.logger;
  const userId = socket.data.userId;
  logger.info(`🟢 [/waiting] Connected: ${socket.id} ${userId}`);

  socket.on('custom-join', (payload) => {
    logger.info(`Custom join event received with payload: ${payload}`);
  });

  socket.on('disconnect', () => {
    logger.info(`🔴 [/waiting] Disconnected: ${socket.id}`);
  });

  socket.on('error', (error: Error) => {
    logger.info(`Error in waiting namespace: ${error.message}`);
  });
}
