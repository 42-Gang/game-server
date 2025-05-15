import { Namespace, Socket } from 'socket.io';
import { socketMiddleware } from '../utils/middleware.js';
import { handleWaitingConnection } from './waiting.handler.js';

export function startWaitingNamespace(namespace: Namespace) {
  namespace.use(socketMiddleware);

  namespace.on('connection', (socket: Socket) => handleWaitingConnection(socket));

  namespace.on('disconnect', (socket: Socket) => {
    console.log(`🔴 [/waiting] Disconnected: ${socket.id}`);
  });

  namespace.on('error', (error: Error) => {
    console.error(`Error in chat namespace: ${error.message}`);
  });
}
