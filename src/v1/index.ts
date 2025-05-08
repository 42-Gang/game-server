import { FastifyInstance } from 'fastify';

import gameRoutes from './apis/game/games.route.js';

export default async function routeV1(fastify: FastifyInstance) {
  fastify.register(gameRoutes, { prefix: '/game' });
}
