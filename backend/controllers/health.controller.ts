import type { Request, Response } from 'express';

export function getHealth(_request: Request, response: Response) {
  response.json({
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    errors: [],
  });
}
