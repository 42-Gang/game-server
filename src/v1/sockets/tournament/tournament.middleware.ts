import { Socket } from 'socket.io';

type NextFunction = (err?: Error) => void;

export async function tournamentMiddleware(socket: Socket, next: NextFunction) {
  try {
    const tournamentId = socket.handshake.query.tournamentId;
    const userId = socket.data.userId;
    if (!tournamentId) {
      return next(new Error('Tournament ID is required'));
    }
    if (!userId) {
      return next(new Error('User ID is required'));
    }

    console.log(`Socket middleware: tournamentId=${tournamentId}`);
    console.log(`Socket middleware: userId=${userId}`);

    next();
  } catch (e) {
    console.error('Socket middleware error:', e);
    next(e as Error);
  }
}
