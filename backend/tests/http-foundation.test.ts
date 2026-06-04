import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { getHealth } from '../controllers/health.controller';
import type { AuthenticatedRequest } from '../domain/types';
import { authenticateRequest } from '../middlewares/authenticate';
import { authorizeRole } from '../middlewares/authorize';
import { errorHandler } from '../middlewares/error-handler';
import { idempotencyMiddleware } from '../middlewares/idempotency';
import { notFoundHandler } from '../middlewares/not-found';
import { parseMultipartUpload } from '../middlewares/upload';
import { ApiError } from '../utils/errors';
import { createAccessToken } from '../utils/token';

function createResponse() {
  const response = {
    body: undefined as unknown,
    statusCode: 200,
    locals: {},
    json(body: unknown) {
      response.body = body;
      return response;
    },
    status(statusCode: number) {
      response.statusCode = statusCode;
      return response;
    },
  };

  return response as typeof response & Response;
}

describe('HTTP foundation', () => {
  it('serves the public health response', () => {
    const response = createResponse();
    getHealth({} as Request, response);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({ data: { status: 'ok' }, errors: [] });
  });

  it('rejects missing tokens with 401', () => {
    const response = createResponse();
    const next = vi.fn() as NextFunction;

    authenticateRequest({ headers: {} } as AuthenticatedRequest, response, next);

    expect(response.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid tokens with 401', () => {
    const response = createResponse();
    const next = vi.fn() as NextFunction;

    authenticateRequest({ headers: { authorization: 'Bearer invalid-token' } } as AuthenticatedRequest, response, next);

    expect(response.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects authenticated users without the required role', () => {
    const response = createResponse();
    const next = vi.fn() as NextFunction;
    const request = {
      auth: { email: 'sale@example.com', role: 'SALE_STAFF', sub: 'sale-1' },
      headers: { authorization: `Bearer ${createAccessToken({ email: 'sale@example.com', role: 'SALE_STAFF', sub: 'sale-1' })}` },
    } as AuthenticatedRequest;

    authorizeRole(['ADMIN'])(request, response, next);

    expect(response.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('requires idempotency keys before create controllers run', async () => {
    const response = createResponse();
    const next = vi.fn() as NextFunction;
    const request = {
      body: {},
      header: () => undefined,
      method: 'POST',
      originalUrl: '/api/purchase-orders',
    } as unknown as AuthenticatedRequest;

    await idempotencyMiddleware(request, response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Idempotency-Key header is required for create requests.' }));
  });

  it('rejects invalid multipart requests before upload controllers run', async () => {
    const response = createResponse();
    const next = vi.fn() as NextFunction;

    await parseMultipartUpload({ headers: {} } as AuthenticatedRequest, response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Content-Type multipart/form-data là bắt buộc.' }));
  });

  it('uses the shared error envelope', async () => {
    const response = createResponse();
    await errorHandler(new ApiError(409, 'Conflict'), {} as Request, response, vi.fn());

    expect(response.statusCode).toBe(409);
    expect(response.body).toEqual({ data: null, errors: [{ message: 'Conflict' }] });

    const notFoundResponse = createResponse();
    notFoundHandler({} as Request, notFoundResponse);
    expect(notFoundResponse.body).toEqual({ data: null, errors: [{ message: 'Route not found.' }] });
  });
});
