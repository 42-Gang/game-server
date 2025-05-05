import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
import { 
  SWAGGER_INFO, 
  SWAGGER_SERVERS, 
  SWAGGER_UI_OPTIONS 
} from './swagger-config.js';

const swaggerOptions = {
  openapi: {
    info: SWAGGER_INFO,
    // components: SWAGGER_SECURITY,
    servers: SWAGGER_SERVERS,
  },
  hideUntagged: true,
  exposeRoute: true,
  transform: jsonSchemaTransform,
};

export default fp(async function (fastify: FastifyInstance) {
  fastify.register(fastifySwagger, swaggerOptions);
  fastify.register(fastifySwaggerUi, SWAGGER_UI_OPTIONS);
});
