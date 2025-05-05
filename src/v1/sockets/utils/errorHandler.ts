export function socketErrorHandler<Args extends unknown[], Return>(
    handler: (...args: Args) => Return | Promise<Return>,
  ): (...args: Args) => void {
    const handleError = (err: unknown) => {
      console.error('please handle me', err);
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