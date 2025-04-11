import { Server } from 'socket.io';
import { FastifyInstance } from 'fastify';
import { registerSocketGateway } from '../v1/sockets/gateway.js';

export function createSocketServer(fastify: FastifyInstance) {
  const socket = new Server(fastify.server, {
    cors: {
      origin: '*',
    },
  });

  registerSocketGateway(socket);
  return socket;
}
