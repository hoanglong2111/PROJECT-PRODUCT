import { Router } from 'express';

import { authenticateRequest } from '../../auth';
import type { AuthenticatedRequest } from '../../types';
import { searchGlobal } from './service';

export function createSearchRouter() {
  const router = Router();

  router.get('/search', authenticateRequest, async (request: AuthenticatedRequest, response) => {
    const query = String(request.query.q ?? '').trim();
    if (query.length < 2) {
      response.json({ data: [], errors: [] });
      return;
    }

    response.json({ data: await searchGlobal(query, request.auth), errors: [] });
  });

  return router;
}
