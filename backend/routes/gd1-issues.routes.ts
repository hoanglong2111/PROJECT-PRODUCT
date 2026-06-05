import { Router } from 'express';
import {
  getIssues,
  postIssue,
  getIssue,
  postResolveIssue,
} from '../controllers/gd1-issues.controller';
import { authenticateRequest } from '../middlewares/authenticate';
import { authorizeDynamicRoute } from '../middlewares/authorize';
import { idempotencyMiddleware } from '../middlewares/idempotency';

export function createGd1IssuesRouter() {
  const router = Router();
  const authGuard = authorizeDynamicRoute('issue_logs');

  router.get('/issues', authenticateRequest, authGuard, getIssues);
  router.post('/issues', authenticateRequest, authGuard, idempotencyMiddleware, postIssue);
  router.get('/issues/:issueId', authenticateRequest, authGuard, getIssue);
  router.post('/issues/:issueId/resolve', authenticateRequest, authGuard, postResolveIssue);

  return router;
}
