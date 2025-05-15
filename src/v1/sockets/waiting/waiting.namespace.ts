import { Namespace, Socket } from 'socket.io';
import { socketMiddleware } from '../utils/middleware.js';
import { handleWaitingConnection } from './waiting.handler.js';

export function startWaitingNamespace(namespace: Namespace) {
  namespace.use(socketMiddleware);

  namespace.on('connection', (socket: Socket) => handleWaitingConnection(socket));
}
