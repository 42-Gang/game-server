import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    internalOnly: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    headers: {
      'X-Authenticated': string | undefined | string[];
      'X-User-Id': string | undefined;
      'X-Internal': string | undefined;
    };

    internal: boolean;
    authenticated: boolean;
    userId: number;
  }
}
