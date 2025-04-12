import { Server } from 'socket.io';
import { socketMiddleware } from './utils/middleware.js';
import gameNamespace from './game/game.namespace.js';

export const registerSocketGateway = (io: Server) => {
  io.use(socketMiddleware);
  gameNamespace(io.of('/game'));
};
