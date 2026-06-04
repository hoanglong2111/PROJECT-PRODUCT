import type { NextFunction, Request, Response } from 'express';

import { ApiError } from '../utils/errors';
import { failIdempotencyRequest } from './idempotency';

export async function errorHandler(error: Error, _request: Request, response: Response, _next: NextFunction) {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;

  await failIdempotencyRequest(response).catch(() => undefined);
  response.status(statusCode).json({
    data: null,
    errors: [{ message: error.message }],
  });
}
