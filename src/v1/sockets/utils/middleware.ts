import { UnAuthorizedException } from '../../common/exceptions/core.error.js';
import process from 'node:process';
import { gotClient } from '../../../plugins/http.client.js';
import { Socket } from 'socket.io';

type NextFunction = (err?: Error) => void;

export async function socketMiddleware(socket: Socket, next: NextFunction) {
  try {
    if (process.env.NODE_ENV === 'dev') {
        socket.data.userId = 1;
        next();
        return;
    }

    const token = socket.handshake.query.token;
    if (!token) {
      throw new UnAuthorizedException('인증되지 않은 사용자입니다.');
    }

    const response = await gotClient.request<{ user_id: number }>({
      method: 'POST',
      url: 'http://auth-server',
      body: {
        access_token: token,
      },
    });

    socket.data.userId = response.body.user_id;
    next();
  } catch (e) {
    next(new UnAuthorizedException('인증되지 않은 사용자입니다.'));
  }
}