import { Server } from 'socket.io';
import { asValue, AwilixContainer } from 'awilix';
import { socketMiddleware } from './utils/middleware.js';
import { startWaitingNamespace } from './waiting/waiting.namespace.js';
import { startTournamentNamespace } from './tournament/tournament.namespace.js';

export const registerSocketGateway = (diContainer: AwilixContainer, io: Server) => {
  io.use(socketMiddleware);

  const waitingNamespace = io.of('/waiting');
  const tournamentNamespace = io.of('/tournament');

  diContainer.register({
    waitingNamespace: asValue(waitingNamespace),
    tournamentNamespace: asValue(tournamentNamespace),
  });

  startWaitingNamespace(waitingNamespace);
  startTournamentNamespace(tournamentNamespace);
};
