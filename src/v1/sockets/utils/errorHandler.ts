import { FastifyBaseLogger } from 'fastify';
import { ZodError } from 'zod';
import { Socket } from 'socket.io';

export function socketErrorHandler<Args extends unknown[], Return>(
  socket: Socket,
  logger: FastifyBaseLogger,
  handler: (...args: Args) => Return | Promise<Return>,
): (...args: Args) => void {
  const handleError = (err: unknown) => {
    if (err instanceof ZodError) {
      logger.error(err, 'ZodError');
      socket.emit('error', {
        message: err.message,
      });
      return;
    }
    if (err instanceof Error) {
      logger.error(err, 'Socket error');
      socket.emit('error', {
        message: err.message,
      });
      return;
    }
  };

  return (...args: Args): void => {
    try {
      const result = handler(...args);

      if (
        result instanceof Promise ||
        (typeof result === 'object' &&
          result !== null &&
          'then' in result &&
          typeof (result as unknown as Promise<Return>).then === 'function')
      ) {
        (result as Promise<Return>).catch(handleError);
      }
    } catch (e) {
      handleError(e);
    }
  };
}
