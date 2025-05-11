import { FastifyInstance } from 'fastify';
import { addRoutes, Route } from '../../../plugins/router.js';

export default async function gameRoutes(fastify: FastifyInstance) {
  // const gameController: GameController = fastify.diContainer.resolve('gameController');

  const routes: Array<Route> = [];

  await addRoutes(fastify, routes);
}
