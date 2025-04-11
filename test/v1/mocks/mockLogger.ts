import { FastifyBaseLogger } from 'fastify';
import { vi } from 'vitest';

export const mockLogger: FastifyBaseLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
  child: vi.fn(),
} as unknown as FastifyBaseLogger;
