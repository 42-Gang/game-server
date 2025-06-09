import { BadRequestException, UnAuthorizedException } from '../../common/exceptions/core.error.js';
import { Socket } from 'socket.io';
import { verifyAccessToken } from './auth.js';

type NextFunction = (err?: Error) => void;

export async function socketMiddleware(socket: Socket, next: NextFunction) {
  try {
    const token = socket.handshake.query.token;
    if (!token || token === '' || Array.isArray(token)) {
      return next(new BadRequestException('유효하지 않은 토큰 형식입니다.'));
    }

    const { status, userId } = await verifyAccessToken(token);
    if (status !== 200) return next(new UnAuthorizedException('인증되지 않은 사용자입니다.'));

    socket.data.userId = parseInt(userId);
    next();
  } catch (e) {
    console.error('Socket middleware error:', e);
    next(e as Error);
  }
}
