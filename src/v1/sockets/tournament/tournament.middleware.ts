import { Socket } from 'socket.io';
import TournamentService from './tournament.service.js';

type NextFunction = (err?: Error) => void;

export async function tournamentMiddleware(socket: Socket, next: NextFunction) {
  try {
    const tournamentId = socket.handshake.query.tournamentId;
    if (!tournamentId || Array.isArray(tournamentId)) {
      return next(new Error('Invalid tournament ID format'));
    }

    const userId = socket.data.userId;
    if (!userId) {
      return next(new Error('User ID is required'));
    }

    const { diContainer } = socket.nsp.server;
    const tournamentService = diContainer.resolve<TournamentService>('tournamentService');

    const parsedTournamentId = parseInt(tournamentId);
    if (isNaN(parsedTournamentId)) {
      return next(new Error('Invalid tournament ID'));
    }

    if (!(await tournamentService.isUserParticipant(parsedTournamentId, userId))) {
      return next(new Error('User is not a participant in this tournament'));
    }

    socket.data.tournamentId = parsedTournamentId;
    next();
  } catch (e) {
    console.error('Socket middleware error:', e);
    next(e as Error);
  }
}
