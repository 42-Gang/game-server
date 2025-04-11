import { RouteShorthandOptions, RouteHandlerMethod } from 'fastify';
import { FastifyInstance } from 'fastify/types/instance.js';

// 권한 필요 여부를 표현할 때 추가 옵션 타입 확장
interface RouteOptions extends RouteShorthandOptions {
  auth?: boolean; // 권한 필요 여부 (옵셔널)
  description?: string; // 설명 (옵셔널)
}

export interface Route {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  handler: RouteHandlerMethod;
  options: RouteOptions;
}

export async function addRoutes(fastify: FastifyInstance, routes: Route[]) {
  routes.forEach((route) => {
    if (route.options.auth) {
      // 권한이 필요한 API라면 인증 훅을 자동으로 추가
      fastify.route({
        method: route.method,
        url: route.url,
        handler: route.handler,
        schema: route.options.schema,
        onRequest: fastify.authenticate, // ✅ 권한 확인 미들웨어
      });
    } else {
      // 권한 필요 없으면 그대로 등록
      fastify.route({
        method: route.method,
        url: route.url,
        handler: route.handler,
        schema: route.options.schema,
      });
    }
  });
}
