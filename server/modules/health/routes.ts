import { Router } from 'express';

export function createHealthRouter() {
  const router = Router();

  router.get('/health', (_request, response) => {
    response.json({
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
      errors: [],
    });
  });

  return router;
}
