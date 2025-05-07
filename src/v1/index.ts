import { FastifyInstance } from 'fastify';

import gamesRoutes from './apis/games.route.js';

export default async function routeV1(fastify: FastifyInstance) {
  fastify.register(gamesRoutes, { prefix: '/games' });
}
