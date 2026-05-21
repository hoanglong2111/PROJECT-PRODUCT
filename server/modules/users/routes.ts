import { Router } from 'express';

import { authenticateRequest, authorizeRole } from '../../auth';
import type { CreateUserBody } from '../../types';
import { createUser, listUsers } from './service';

export function createUsersRouter() {
  const router = Router();

  router.get('/users', authenticateRequest, authorizeRole(['ADMIN']), async (_request, response) => {
    response.json({ data: await listUsers(), errors: [] });
  });

  router.post('/users', authenticateRequest, authorizeRole(['ADMIN']), async (request, response) => {
    const result = await createUser(request.body as CreateUserBody);
    if ('error' in result) {
      response.status(result.status).json({ data: null, errors: [{ message: result.error }] });
      return;
    }

    response.status(201).json({ data: result.data, errors: [] });
  });

  return router;
}
