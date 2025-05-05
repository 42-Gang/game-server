import { Server } from 'socket.io';
import chatNamespace from './chat/chat.namespace.js';
import { socketMiddleware } from './utils/middleware.js';

export const registerSocketGateway = (io: Server) => {
  io.use(socketMiddleware);
  chatNamespace(io.of('/chat'));
};
