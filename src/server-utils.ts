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
  return {
    level: 'info',
    transport: {
      target: process.env.NODE_ENV === 'dev' ? 'pino-pretty' : 'pino',
      options: {
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  };
}

export async function startServer(server: FastifyInstance) {
  try {
    await server.listen({ port: Number(process.env.FASTIFY_PORT) || 3000, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}
