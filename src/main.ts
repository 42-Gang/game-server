import { createServer, startServer } from './server-utils.js';
import { configureServer, registerPlugins, setupGracefulShutdown } from './server-config.js';
import { createSocketServer } from './plugins/socket.js';

async function init() {
  const server = createServer();
  await configureServer(server); // 서버 설정
  await registerPlugins(server); // 플러그인 등록

  await server.ready(); // 플러그인 로딩 완료 대기
  await startServer(server); // 서버 시작

  const socket = createSocketServer(server);
  await setupGracefulShutdown(server, socket); // 서버 종료 시그널 핸들러 등록
}

init();
