import { Server } from 'socket.io';
import { asValue, AwilixContainer } from 'awilix';
import { socketMiddleware } from './utils/middleware.js';
import { startChatNamespace } from './waiting/chat.namespace.js';

export const registerSocketGateway = (diContainer: AwilixContainer, io: Server) => {
  io.use(socketMiddleware);

  const chatNamespace = io.of('/waiting');

  diContainer.register({
    chatNamespace: asValue(chatNamespace),
  });

  startChatNamespace(chatNamespace);
};
