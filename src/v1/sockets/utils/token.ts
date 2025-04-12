import { decode } from 'js-base64';
import { BadRequestException } from '../../common/exceptions/core.error.js';

export function decodeJwtPayload(token: string): { id: number } {
  const payload = token.split('.')[1];
  if (!payload) throw new BadRequestException('JWT 형식이 잘못되었습니다.');

  const decoded = decode(payload);
  return JSON.parse(decoded);
}
