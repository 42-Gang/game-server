import { Server } from 'socket.io';
import { FastifyInstance } from 'fastify';
import { registerSocketGateway } from '../v1/sockets/gateway.js';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis } from './redis.js';
import { asClass, Lifetime } from 'awilix';

export async function createSocketServer(fastify: FastifyInstance) {
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
  await registerSocketHandler(socket);
  return socket;
}

async function registerSocketHandler(socket: Server) {
  const NODE_EXTENSION = process.env.NODE_ENV == 'dev' ? 'ts' : 'js';
  await socket.diContainer.loadModules([`./**/src/**/*.socket.handler.${NODE_EXTENSION}`], {
    esModules: true,
    formatName: 'camelCase',
    resolverOptions: {
      lifetime: Lifetime.SINGLETON,
      register: asClass,
      injectionMode: 'CLASSIC',
    },
  });
}
