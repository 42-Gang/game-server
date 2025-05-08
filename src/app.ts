import { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import routeV1 from './v1/index.js';
import { STATUS } from './v1/common/constants/status.js';

export default async function app(fastify: FastifyInstance) {
  setErrorHandler(fastify);
  setDecorate(fastify);
  setMiddleware(fastify);

  fastify.register(routeV1, { prefix: '/v1' });
}

function setErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    fastify.log.error(error);
    const statusCode: number = error.statusCode || 500;
    reply.code(statusCode).send({
      status: STATUS.ERROR,
      message: error.message,
    });
  });
}

function setMiddleware(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, _reply) => {
    const internal = request.headers['x-internal'];
    const authenticated = request.headers['x-authenticated'];
    const userId = request.headers['x-user-id'];

    request.internal = false;
    if (internal !== undefined && !Array.isArray(internal) && internal === 'true') {
      request.internal = true;
    }

    if (authenticated === undefined || Array.isArray(authenticated)) {
      request.authenticated = false;
      request.userId = -1;
      return;
    }

    if (userId === undefined || Array.isArray(userId) || isNaN(Number(userId))) {
      request.authenticated = false;
      request.userId = -1;
      return;
    }

    if (authenticated === 'true') {
      request.authenticated = true;
      request.userId = parseInt(userId as string, 10);
    }
  });
}

function setDecorate(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.authenticated) {
      reply.code(401).send({
        status: STATUS.ERROR,
        message: '인증되지 않은 요청입니다.',
      });
    }
  });

  fastify.decorate('internalOnly', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.internal) {
      return reply.status(403).send({
        status: STATUS.ERROR,
        message: '내부 접근만 허용됩니다.',
      });
    }
  });
}
