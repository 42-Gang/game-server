import 'socket.io';
import { FastifyBaseLogger } from 'fastify';
import { RedisClient } from 'ioredis/built/connectors/SentinelConnector/types.js';
import { AwilixContainer } from 'awilix';

declare module 'socket.io' {
  interface Server {
    logger: FastifyBaseLogger;
    diContainer: AwilixContainer;
    data: {
      userId: number;
    };
    redis: RedisClient;
  }

  interface Server {
    redis: RedisClient;
  }
}
