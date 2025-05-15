import { FastifyBaseLogger } from 'fastify';

export function socketErrorHandler<Args extends unknown[], Return>(
  logger: FastifyBaseLogger,
  handler: (...args: Args) => Return | Promise<Return>,
): (...args: Args) => void {
  const handleError = (err: unknown) => {
    logger.error(err, 'please handle me');
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
