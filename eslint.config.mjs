import globals from 'globals';
import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import tseslintParser from '@typescript-eslint/parser';
import prettierPlugin from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';
import { globalIgnores } from 'eslint/config';
import * as tseslint from 'typescript-eslint';

export default tseslint.config(
  globalIgnores(['node_modules', 'dist', 'coverage', 'vitest.config.ts',
    'eslint.config.mjs']),
  {
    // 이 config가 적용될 파일 대상
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],

    // TypeScript + Node 환경 구성
    languageOptions: {
      globals: {
        ...globals.node, // Node.js 전역 객체 활성화 (예: process, __dirname 등)
      },
      parser: tseslintParser, // TypeScript 파서를 설정
      parserOptions: {
        sourceType: 'module',
        project: './tsconfig.eslint.json', // tsconfig 파일 경로
      },
    },

    // 사용할 ESLint 플러그인
    plugins: {
      '@typescript-eslint': tseslintPlugin, // TS 문법 전용 규칙
      import: importPlugin,                 // import 정렬 및 순서 관련 규칙
      prettier: prettierPlugin,              // Prettier 포맷팅과 통합
    },

    // 실제로 적용할 ESLint 규칙
    rules: {
      // TypeScript ESLint의 추천 규칙 전체 사용
      ...tseslintPlugin.configs.recommended.rules,

      // ✅ Prettier 포맷 규칙도 ESLint 오류로 처리
      'prettier/prettier': 'error',

      // ✅ indent 관련 규칙은 Prettier가 처리하므로 끔
      indent: 'off',
      '@typescript-eslint/indent': 'off',

      // ✅ 사용하지 않는 변수 관련 규칙
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',     // 함수 인자 중 _로 시작하면 무시 (예: (_, index) => ...)
          varsIgnorePattern: '^_',     // 변수명 _로 시작하면 무시 (예: const _unused = ...)
          caughtErrors: 'none',          // catch(e) 무조건 체크 (e가 미사용이면 에러)
        },
      ],
    },

    // import-plugin 관련 설정
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true, // @types 경로도 import 인식하게 함
        },
      },
    },
  },
);
