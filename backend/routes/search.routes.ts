import { Router } from 'express';

import { getSearch } from '../controllers/search.controller';
import { authenticateRequest } from '../middlewares/authenticate';

export function createSearchRouter() {
  const router = Router();
  router.get('/search', authenticateRequest, getSearch);
  return router;
}
