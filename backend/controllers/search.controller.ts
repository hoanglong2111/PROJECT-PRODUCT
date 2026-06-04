import type { Response } from 'express';

import type { AuthenticatedRequest } from '../domain/types';
import { searchGlobal } from '../services/search.service';

export async function getSearch(request: AuthenticatedRequest, response: Response) {
  const query = String(request.query.q ?? '').trim();
  response.json({ data: query.length < 2 ? [] : await searchGlobal(query, request.auth), errors: [] });
}
