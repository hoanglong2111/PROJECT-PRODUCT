import type { Request, Response } from 'express';

import { readDashboardStats } from '../services/dashboard.service';

export async function getDashboardStats(_request: Request, response: Response) {
  response.json({ data: await readDashboardStats(), errors: [] });
}
