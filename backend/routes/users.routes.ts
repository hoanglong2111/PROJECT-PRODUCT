import { Router } from 'express';

import { getMyPreferences, getUsers, postUser, putMyPreferences } from '../controllers/users.controller';
import { authenticateRequest } from '../middlewares/authenticate';
import { authorizeRole } from '../middlewares/authorize';

export function createUsersRouter() {
  const router = Router();
  router.get('/users', authenticateRequest, authorizeRole(['ADMIN']), getUsers);
  router.get('/users/me/preferences', authenticateRequest, getMyPreferences);
  router.put('/users/me/preferences', authenticateRequest, putMyPreferences);
  router.post('/users', authenticateRequest, authorizeRole(['ADMIN']), postUser);
  return router;
}
