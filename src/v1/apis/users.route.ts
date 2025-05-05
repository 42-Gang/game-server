import { FastifyInstance } from 'fastify';

import { getUserParamsSchema } from './user.schema.js';
import { addRoutes, Route } from '../../plugins/router.js';
import UsersController from './users.controller.js';

export default async function usersRoutes(fastify: FastifyInstance) {
  const usersController: UsersController = fastify.diContainer.resolve('usersController');
  const routes: Array<Route> = [
    {
      method: 'GET',
      url: '/:id',
      handler: usersController.findUser,
      options: {
        schema: {
          tags: ['users'],
          params: getUserParamsSchema,
        },
        auth: true,
      },
    },
  ];
  await addRoutes(fastify, routes);
}
