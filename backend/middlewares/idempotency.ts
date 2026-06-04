import { createHash } from 'node:crypto';
import type { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from '../domain/types';
import {
  claimIdempotencyKey,
  completeIdempotencyKey,
  failIdempotencyKey,
  findIdempotencyRecord,
} from '../models/idempotency';
import { tenantIdFromAuth } from '../utils/auth';
import { ApiError } from '../utils/errors';

type JsonObject = Record<string, unknown>;
type IdempotencyState = {
  key: string;
  originalJson: Response['json'];
  tenantId: string;
};

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === 'object') {
    return Object.keys(value as JsonObject)
      .sort()
      .reduce<JsonObject>((accumulator, key) => {
        accumulator[key] = sortJson((value as JsonObject)[key]);
        return accumulator;
      }, {});
  }

  return value ?? null;
}

function hashRequest(request: AuthenticatedRequest): string {
  return createHash('sha256')
    .update(request.method)
    .update(':')
    .update(request.originalUrl)
    .update(':')
    .update(JSON.stringify(sortJson(request.body)))
    .digest('hex');
}

function takeIdempotencyState(response: Response) {
  const state = response.locals.idempotencyState as IdempotencyState | undefined;
  if (state) {
    delete response.locals.idempotencyState;
    response.json = state.originalJson;
  }
  return state;
}

export async function idempotencyMiddleware(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
) {
  try {
    const key = String(request.header('Idempotency-Key') ?? '').trim();
    if (!key) {
      throw new ApiError(400, 'Idempotency-Key header is required for create requests.');
    }

    const tenantId = tenantIdFromAuth(request.auth);
    const requestHash = hashRequest(request);
    const claimed = await claimIdempotencyKey({
      key,
      method: request.method,
      path: request.originalUrl,
      requestHash,
      tenantId,
    });

    if (!claimed) {
      const existing = await findIdempotencyRecord(tenantId, key);
      if (!existing) {
        throw new ApiError(409, 'Idempotency key conflict. Please retry.');
      }
      if (existing.request_hash !== requestHash) {
        throw new ApiError(409, 'Idempotency-Key was reused with a different request payload.');
      }
      if (existing.status === 'COMPLETED' && existing.response_status && existing.response_body) {
        response.status(existing.response_status).json(existing.response_body);
        return;
      }
      throw new ApiError(409, 'A request with this Idempotency-Key is already in progress.');
    }

    const originalJson = response.json.bind(response) as Response['json'];
    response.locals.idempotencyState = { key, originalJson, tenantId } satisfies IdempotencyState;
    response.json = ((body: unknown) => {
      const state = takeIdempotencyState(response);
      if (!state) {
        return originalJson(body);
      }

      void completeIdempotencyKey(state.tenantId, state.key, response.statusCode, body)
        .then(() => state.originalJson(body))
        .catch(next);
      return response;
    }) as Response['json'];
    next();
  } catch (error) {
    next(error);
  }
}

export async function failIdempotencyRequest(response: Response) {
  const state = takeIdempotencyState(response);
  if (state) {
    await failIdempotencyKey(state.tenantId, state.key);
  }
}
