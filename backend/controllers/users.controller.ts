import type { Response } from 'express';

import type { AuthenticatedRequest, CreateUserBody } from '../domain/types';
import { getUserPreferences, upsertUserPreferences } from '../services/user-preferences.service';
import { createUser, listUsers } from '../services/users.service';
import { ApiError } from '../utils/errors';

export async function getUsers(_request: AuthenticatedRequest, response: Response) {
  response.json({ data: await listUsers(), errors: [] });
}

export async function getMyPreferences(request: AuthenticatedRequest, response: Response) {
  if (!request.auth?.sub) throw new ApiError(401, 'Unauthenticated');
  response.json({ data: await getUserPreferences(request.auth.sub), errors: [] });
}

export async function putMyPreferences(request: AuthenticatedRequest, response: Response) {
  if (!request.auth?.sub) throw new ApiError(401, 'Unauthenticated');
  response.json({ data: await upsertUserPreferences(request.auth.sub, request.body), errors: [] });
}

export async function postUser(request: AuthenticatedRequest, response: Response) {
  const result = await createUser(request.body as CreateUserBody);
  if ('error' in result) throw new ApiError(result.status, result.error ?? 'Request failed.');
  response.status(201).json({ data: result.data, errors: [] });
}
