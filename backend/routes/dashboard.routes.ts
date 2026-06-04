import { Router } from 'express';

import { getDashboardStats } from '../controllers/dashboard.controller';
import { authenticateRequest } from '../middlewares/authenticate';

export function createDashboardRouter() {
  const router = Router();
  router.get('/dashboard/stats', authenticateRequest, getDashboardStats);
  return router;
}
