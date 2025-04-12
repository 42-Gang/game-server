import { BadRequestException, UnAuthorizedException } from '../../common/exceptions/core.error.js';
import { Socket } from 'socket.io';
import { decodeJwtPayload } from './token.js';
import { verifyAccessToken } from './auth.js';

type NextFunction = (err?: Error) => void;

export async function socketMiddleware(socket: Socket, next: NextFunction) {
  try {
    const token = socket.handshake.query.token;
    if (!token || token === '' || Array.isArray(token)) {
      return next(new BadRequestException('유효하지 않은 토큰 형식입니다.'));
    }

    const isVerified = await verifyAccessToken(token);
    if (!isVerified) return next(new UnAuthorizedException('인증되지 않은 사용자입니다.'));

    const { id } = decodeJwtPayload(token);
    socket.data.userId = id;
    next();
  } catch (e) {
    console.error('Socket middleware error:', e);
    next(e as Error);
  }
}
