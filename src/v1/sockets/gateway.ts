import { Server } from 'socket.io';
import { asValue, AwilixContainer } from 'awilix';
import { socketMiddleware } from './utils/middleware.js';
import { startWaitingNamespace } from './waiting/waiting.namespace.js';

export const registerSocketGateway = (diContainer: AwilixContainer, io: Server) => {
  io.use(socketMiddleware);

  const chatNamespace = io.of('/waiting');

  diContainer.register({
    chatNamespace: asValue(chatNamespace),
  });

  startWaitingNamespace(chatNamespace);
};
