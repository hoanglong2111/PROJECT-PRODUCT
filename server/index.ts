import 'dotenv/config';

import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';

import { API_PREFIX, CORS_ORIGINS, PORT, normalizeOrigin } from './constants';
import { ApiError } from './errors';
import { createAuthRouter } from './modules/auth/routes';
import { createDashboardRouter } from './modules/dashboard/routes';
import { createDeliveryOrdersRouter } from './modules/deliveryOrders/routes';
import { createEfmsRouter } from './modules/efms/routes';
import { createExchangeRatesRouter } from './modules/exchangeRates/routes';
import { createHealthRouter } from './modules/health/routes';
import { createPurchaseOrdersRouter } from './modules/purchaseOrders/routes';
import { createPurchaseRequestsRouter } from './modules/purchaseRequests/routes';
import { createQuotationsRouter } from './modules/quotations/routes';
import { createSearchRouter } from './modules/search/routes';
import { createTasksRouter } from './modules/tasks/routes';
import { createUsersRouter } from './modules/users/routes';
import { ensureSchemaAndSeed } from './schema';

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || CORS_ORIGINS.includes(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin is not allowed: ${origin}`));
    },
  }),
);
app.use(express.json());

app.use(API_PREFIX, createHealthRouter());
app.use(API_PREFIX, createAuthRouter());
app.use(API_PREFIX, createUsersRouter());
app.use(API_PREFIX, createSearchRouter());
app.use(API_PREFIX, createExchangeRatesRouter());
app.use(API_PREFIX, createPurchaseRequestsRouter());
app.use(API_PREFIX, createQuotationsRouter());
app.use(API_PREFIX, createPurchaseOrdersRouter());
app.use(API_PREFIX, createDeliveryOrdersRouter());
app.use(API_PREFIX, createEfmsRouter());
app.use(API_PREFIX, createTasksRouter());
app.use(API_PREFIX, createDashboardRouter());

app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;

  response.status(statusCode).json({
    data: null,
    errors: [{ message: error.message }],
  });
});

start().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start KBFE backend:', error);
  process.exit(1);
});

async function start() {
  await ensureSchemaAndSeed();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`KBFE backend is running at http://localhost:${PORT}${API_PREFIX}`);
  });
}
