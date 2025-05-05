import Fastify, { FastifyInstance } from 'fastify';

export function createServer() {
  return Fastify({
    logger: getLoggerOptions(),
    ajv: {
      customOptions: {
        coerceTypes: 'array',
        removeAdditional: 'all',
      },
    },
  });
}

export function getLoggerOptions() {
  if (process.stdout.isTTY) {
    return {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    };
  }
  return { level: process.env.FASTIFY_LOG_LEVEL || 'error' };
}

export async function startServer(server: FastifyInstance) {
  try {
    await server.listen({ port: Number(process.env.FASTIFY_PORT) || 3000 });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}
