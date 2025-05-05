export const SWAGGER_INFO = {
  title: '🎾 PING PONG GANG API',
  description: `
  PING PONG GANG API는 **사용자 인증, 게임 매칭, 랭킹 시스템** 등을 포함하는 **RESTful API**입니다.
  
  ---
  
  #### 🚀 주요 기능
  - 🔐 **인증 시스템**: 회원가입, 로그인, JWT 토큰 인증
  - 🎮 **게임 매칭**: 유저 간 매칭 및 게임 진행
  - 🏆 **랭킹 시스템**: 점수 기반의 랭킹 관리
  - 📡 **웹소켓 지원**: 실시간 알림 및 게임 상태 업데이트
  
  ---
  
  본 API는 **Fastify + TypeScript** 기반으로 설계되었으며, **OpenAPI(Swagger)** 를 통해 문서화되었습니다.
  `,
  version: '0.1.0',
};

export const SWAGGER_SECURITY = {
  securitySchemes: {
    apiKey: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
    },
  },
};

export const SWAGGER_SERVERS = [{ url: 'http://localhost:3000/api' }];

export const SWAGGER_UI_OPTIONS = {
  routePrefix: '/docs',
  exposeRoute: true,
};
