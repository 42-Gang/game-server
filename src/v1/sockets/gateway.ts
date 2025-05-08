import { Server } from 'socket.io';
import { asValue, AwilixContainer } from 'awilix';
import startChatNamespace from './chat/startChatNamespace.js';
import { socketMiddleware } from './utils/middleware.js';

export const registerSocketGateway = (diContainer: AwilixContainer, io: Server) => {
  io.use(socketMiddleware);

  const chatNamespace = io.of('/chat');

  diContainer.register({
    chatNamespace: asValue(chatNamespace),
  });

  startChatNamespace(io.of('/chat'));
};
