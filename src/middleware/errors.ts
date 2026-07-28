import type { NextFunction, Request, Response } from 'express';

import { env } from '../config/env';

/** An error with an intended HTTP status, thrown from controllers. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, message, details);
export const unauthorized = (message = 'Authentication required.') =>
  new HttpError(401, message);
export const forbidden = (message = 'You do not have access to this branch.') =>
  new HttpError(403, message);
export const notFoundError = (message = 'Not found.') => new HttpError(404, message);
export const conflict = (message: string, details?: unknown) =>
  new HttpError(409, message, details);

/**
 * Wraps an async handler so a rejected promise reaches the error middleware.
 * Express 4 does not do this itself — without it, a thrown async error hangs
 * the request instead of returning 500.
 */
export function asyncHandler<T extends Request>(
  handler: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: T, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not found',
    message: `No route matches ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  // Express identifies error middleware by its four-argument signature, so
  // `next` must stay even though it is unused.
  _next: NextFunction,
): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
    return;
  }

  console.error('[error]', error);

  res.status(500).json({
    error: 'Internal server error',
    // Never leak stack traces or driver messages to a browser in production.
    ...(env.isProduction ? {} : { message: (error as Error)?.message }),
  });
}
