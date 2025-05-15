import { Namespace, Socket } from 'socket.io';

export function handleWaitingConnection(namespace: Namespace, socket: Socket) {
  console.log(`🟢 [/waiting] Connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🔴 [/waiting] Disconnected: ${socket.id}`);
  });

  socket.on('error', (error: Error) => {
    console.error(`Error in waiting namespace: ${error.message}`);
  });
}
