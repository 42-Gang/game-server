import { Namespace, Socket } from 'socket.io';
import * as console from 'node:console';
import { joinRoomSchema, messageSchema } from './chat.schema.js';
import { z } from 'zod';
// import { socketErrorHandler } from '../utils/errorHandler.js';
import { socketMiddleware } from '../utils/middleware.js';

export default function startChatNamespace(namespace: Namespace) {
  namespace.use(socketMiddleware);

  namespace.on('connection', (socket: Socket) => {
    console.log(`🟢 [/chat] Connected: ${socket.id}`);

    socket.on('join', (payload: z.infer<typeof joinRoomSchema>) => {
      console.log(`🔗 ${socket.id} joined room ${payload.roomId}`);
      socket.join(payload.roomId);
      socket.to(payload.roomId).emit('join', `${socket.id} joined room ${payload.roomId}`);
    });

    socket.on('message', (payload: z.infer<typeof messageSchema>) => {
      console.log(`💬 ${socket.id} sent message to room ${payload.roomId}: ${payload.message}`);
      socket.to(payload.roomId).emit('message', payload.message);
    });

    socket.on('disconnect', () => {
      console.log(`🔴 [/chat] Disconnected: ${socket.id}`);
    });
  });
}
