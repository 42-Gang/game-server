import { FastifyInstance } from 'fastify';
import { addRoutes, Route } from '../../../plugins/router.js';
import GameController from './game.controller.js';
import { getHistoryParamsSchema, getHistoryResponseSchema } from './schemas/get-history.schema.js';

export default async function gameRoutes(fastify: FastifyInstance) {
  const gameController: GameController = fastify.diContainer.resolve('gameController');
  
  const routes: Array<Route> = [
    {
      method: 'GET',
      url: '/history/:type',
      handler: gameController.getHistory,
      options: {
        schema: {
          tags: ['game'],
          description: '히스토리 조회',
          params: getHistoryParamsSchema,
          response: {
            201: getHistoryResponseSchema,
          },
        },
        auth: true,
      },
    },
  ];

  await addRoutes(fastify, routes);
}