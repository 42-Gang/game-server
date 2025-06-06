import 'socket.io';

declare module 'socket.io' {
  interface Server {
    logger: import('fastify').FastifyBaseLogger;
    diContainer: import('awilix').AwilixContainer;
    redis: import('ioredis').RedisClient;
  }

  interface SocketData {
    userId: number;
    tournamentId: number;
  }
}
