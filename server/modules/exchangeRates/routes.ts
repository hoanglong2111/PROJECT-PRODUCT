import { Router } from 'express';

import { authenticateRequest, authorizeRole } from '../../auth';
import { readAllRoles } from '../../constants';
import { fetchExchangeRates, normalizeCurrencyCode } from './service';

export function createExchangeRatesRouter() {
  const router = Router();

  router.get('/exchange-rates', authenticateRequest, authorizeRole(readAllRoles), async (request, response) => {
    const baseQuery = Array.isArray(request.query.base) ? request.query.base[0] : request.query.base;
    const base = baseQuery === undefined ? 'USD' : normalizeCurrencyCode(baseQuery, 'base');
    response.json({ data: await fetchExchangeRates(base), errors: [] });
  });

  return router;
}
