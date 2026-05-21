import { Router } from 'express';

import { authenticateRequest } from '../../auth';
import type { AuthenticatedRequest } from '../../types';
import { authenticateUser, readCurrentUser, updateProfile } from './service';

export function createAuthRouter() {
  const router = Router();

  router.post('/auth/login', async (request, response) => {
    const result = await authenticateUser(request.body?.email, request.body?.password);
    if ('error' in result) {
      response.status(result.status).json({ data: null, errors: [{ message: result.error }] });
      return;
    }

    response.json({ data: result.data, errors: [] });
  });

  router.get('/auth/me', authenticateRequest, async (request: AuthenticatedRequest, response) => {
    const user = await readCurrentUser(request.auth?.sub);
    if (!user) {
      response.status(404).json({ data: null, errors: [{ message: 'Không tìm thấy tài khoản.' }] });
      return;
    }

    response.json({ data: user, errors: [] });
  });

  router.patch('/profile', authenticateRequest, async (request: AuthenticatedRequest, response) => {
    const result = await updateProfile(request.auth?.sub, request.body);
    if ('error' in result) {
      response.status(result.status).json({ data: null, errors: [{ message: result.error }] });
      return;
    }

    response.json({ data: result.data, errors: [] });
  });

  return router;
}
