import { ProcessEnv } from 'process';

export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DB_SYSTEM: string;
      DB_HOST: string;
      DB_PORT: string;
      DB_NAME: string;
      DB_USER: string;
      DB_PASSWORD: string;

      FASTIFY_LOG_LEVEL: string;
      FASTIFY_PORT: string;
      FASTIFY_CLOSE_GRACE_PERIOD: string;

      REDIS_HOST: string;
      REDIS_PORT: string;

      JWT_SECRET: string;
      JWT_EXPIRES_IN: string;
      JWT_REFRESH_EXPIRES_IN: string;
    }
  }
}
