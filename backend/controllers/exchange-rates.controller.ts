import type { Request, Response } from 'express';

import { fetchExchangeRates, normalizeCurrencyCode } from '../services/exchange-rates.service';

export async function getExchangeRates(request: Request, response: Response) {
  const baseQuery = Array.isArray(request.query.base) ? request.query.base[0] : request.query.base;
  const base = baseQuery === undefined ? 'USD' : normalizeCurrencyCode(baseQuery, 'base');
  response.json({ data: await fetchExchangeRates(base), errors: [] });
}
