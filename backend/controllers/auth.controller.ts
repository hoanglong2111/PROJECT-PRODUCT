import type { Response } from 'express';

import type { AuthenticatedRequest } from '../domain/types';
import { authenticateUser, readCurrentUser, updateEmail, updatePassword, updateProfile } from '../services/auth.service';
import { ApiError } from '../utils/errors';

function unwrapResult<T>(result: { data: T } | { error?: string; status: number }) {
  if ('data' in result) {
    return result.data;
  }

  throw new ApiError(result.status, result.error ?? 'Request failed.');
}

export async function login(request: AuthenticatedRequest, response: Response) {
  const data = unwrapResult(await authenticateUser(request.body?.email, request.body?.password));
  response.json({ data, errors: [] });
}

export async function getCurrentUser(request: AuthenticatedRequest, response: Response) {
  const user = await readCurrentUser(request.auth?.sub);
  if (!user) {
    throw new ApiError(404, 'Không tìm thấy tài khoản.');
  }

  response.json({ data: user, errors: [] });
}

export async function patchProfile(request: AuthenticatedRequest, response: Response) {
  response.json({ data: unwrapResult(await updateProfile(request.auth?.sub, request.body)), errors: [] });
}

export async function patchEmail(request: AuthenticatedRequest, response: Response) {
  response.json({ data: unwrapResult(await updateEmail(request.auth?.sub, request.body)), errors: [] });
}

export async function patchPassword(request: AuthenticatedRequest, response: Response) {
  response.json({ data: unwrapResult(await updatePassword(request.auth?.sub, request.body)), errors: [] });
}
