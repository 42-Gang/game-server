import { Namespace, Socket } from 'socket.io';
import * as console from 'node:console';
import { socketMiddleware } from '../utils/middleware.js';

export default function gameNamespace(namespace: Namespace) {
  namespace.use(socketMiddleware);

  namespace.on('connection', (socket: Socket) => {
    console.log(`🟢 [/chat] Connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`🔴 [/chat] Disconnected: ${socket.id}`);
    });
  });
}
