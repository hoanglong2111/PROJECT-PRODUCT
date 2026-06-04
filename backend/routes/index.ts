import type { Express } from 'express';

import { API_PREFIX } from '../domain/constants';
import { createAuthRouter } from './auth.routes';
import { createDashboardRouter } from './dashboard.routes';
import { createDeliveryOrdersRouter } from './delivery-orders.routes';
import { createEfmsRouter } from './efms.routes';
import { createExchangeRatesRouter } from './exchange-rates.routes';
import { createHealthRouter } from './health.routes';
import { createPurchaseOrdersRouter } from './purchase-orders.routes';
import { createPurchaseRequestsRouter } from './purchase-requests.routes';
import { createQuotationsRouter } from './quotations.routes';
import { createSearchRouter } from './search.routes';
import { createTasksRouter } from './tasks.routes';
import { createUsersRouter } from './users.routes';

export function mountRoutes(app: Express) {
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
}
