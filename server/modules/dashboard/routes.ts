import { Router } from 'express';

import { authenticateRequest } from '../../auth';
import { readDashboardStats } from './service';

export function createDashboardRouter() {
  const router = Router();

  router.get('/dashboard/stats', authenticateRequest, async (_request, response) => {
    response.json({ data: await readDashboardStats(), errors: [] });
  });

  return router;
}
