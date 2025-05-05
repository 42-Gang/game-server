// vite.config.ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true, // Jest의 global describe, it 처럼 동작
    environment: 'node', // Node 환경 지정
    coverage: {
      provider: 'v8',
    },
    setupFiles: ['./test/vitest.setup.ts'],
  },
});
