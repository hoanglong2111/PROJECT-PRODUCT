import express from 'express';

import { corsMiddleware } from './middlewares/cors';
import { errorHandler } from './middlewares/error-handler';
import { notFoundHandler } from './middlewares/not-found';
import { mountRoutes } from './routes';

export function createApp() {
  const app = express();
  app.use(corsMiddleware);
  app.use(express.json());
  mountRoutes(app);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
