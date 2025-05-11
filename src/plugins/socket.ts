import { Server } from 'socket.io';
import { FastifyInstance } from 'fastify';
import { registerSocketGateway } from '../v1/sockets/gateway.js';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis } from './redis.js';

export function createSocketServer(fastify: FastifyInstance) {
  const socket = new Server(fastify.server, {
    cors: {
      origin: '*',
    },
  });
  socket.logger = fastify.log;
  socket.diContainer = fastify.diContainer;

  const pubClient = redis;
  const subClient = pubClient.duplicate();

  socket.adapter(createAdapter(pubClient, subClient));

  registerSocketGateway(fastify.diContainer, socket);
  return socket;
}
