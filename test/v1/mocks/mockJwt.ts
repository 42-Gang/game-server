import { JWT } from '@fastify/jwt';
import { vi } from 'vitest';

export const mockJwt: JWT = {
  sign: vi.fn().mockReturnValue('tmp-access-token'),
  verify: vi.fn(),
  decode: vi.fn(),
} as unknown as JWT;
