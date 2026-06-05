import { Router } from 'express';
import {
  getDTOs,
  postDTO,
  getDTO,
  postDTOQuote,
  postDTOSelectQuote,
} from '../controllers/gd1-dtos.controller';
import { authenticateRequest } from '../middlewares/authenticate';
import { authorizeDynamicRoute } from '../middlewares/authorize';
import { idempotencyMiddleware } from '../middlewares/idempotency';

export function createGd1DtosRouter() {
  const router = Router();
  const authGuard = authorizeDynamicRoute('domestic_transport_orders');

  router.get('/domestic-transport-orders', authenticateRequest, authGuard, getDTOs);
  router.post('/domestic-transport-orders', authenticateRequest, authGuard, idempotencyMiddleware, postDTO);
  router.get('/domestic-transport-orders/:dtoId', authenticateRequest, authGuard, getDTO);
  router.post('/domestic-transport-orders/:dtoId/quotes', authenticateRequest, authGuard, idempotencyMiddleware, postDTOQuote);
  router.post('/domestic-transport-orders/:dtoId/quotes/:quoteId/select', authenticateRequest, authGuard, postDTOSelectQuote);

  return router;
}
