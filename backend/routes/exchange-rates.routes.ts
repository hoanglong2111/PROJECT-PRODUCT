import { Router } from 'express';

import { getExchangeRates } from '../controllers/exchange-rates.controller';
import { readAllRoles } from '../domain/constants';
import { authenticateRequest } from '../middlewares/authenticate';
import { authorizeRole } from '../middlewares/authorize';

export function createExchangeRatesRouter() {
  const router = Router();
  router.get('/exchange-rates', authenticateRequest, authorizeRole(readAllRoles), getExchangeRates);
  return router;
}
