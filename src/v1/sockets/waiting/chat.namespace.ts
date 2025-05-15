import { Namespace, Socket } from 'socket.io';
import { socketMiddleware } from '../utils/middleware.js';

export function startChatNamespace(namespace: Namespace) {
  namespace.use(socketMiddleware);

  namespace.on('connection', (socket: Socket) => {
    console.log(`🟢 [/waiting] Connected: ${socket.id}, ${socket.data.userId}`);
  });

  namespace.on('disconnect', (socket: Socket) => {
    console.log(`🔴 [/waiting] Disconnected: ${socket.id}`);
  });

  namespace.on('error', (error: Error) => {
    console.error(`Error in chat namespace: ${error.message}`);
  });
}
