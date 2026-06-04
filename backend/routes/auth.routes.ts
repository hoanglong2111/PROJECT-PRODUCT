import { Router } from 'express';

import { getCurrentUser, login, patchEmail, patchPassword, patchProfile } from '../controllers/auth.controller';
import { authenticateRequest } from '../middlewares/authenticate';

export function createAuthRouter() {
  const router = Router();
  router.post('/auth/login', login);
  router.get('/auth/me', authenticateRequest, getCurrentUser);
  router.patch('/profile', authenticateRequest, patchProfile);
  router.patch('/profile/email', authenticateRequest, patchEmail);
  router.patch('/profile/password', authenticateRequest, patchPassword);
  return router;
}
