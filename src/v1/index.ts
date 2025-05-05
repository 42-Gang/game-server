import { FastifyInstance } from 'fastify';

import usersRoutes from './apis/users.route.js';

export default async function routeV1(fastify: FastifyInstance) {
  fastify.register(usersRoutes);
}
