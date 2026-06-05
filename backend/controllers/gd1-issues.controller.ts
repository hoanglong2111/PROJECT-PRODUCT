import type { Response } from 'express';
import type { AuthenticatedRequest } from '../domain/types';
import { gd1IssueService } from '../services/gd1-issues.service';

const decodeParam = (value: unknown) => decodeURIComponent(String(value ?? ''));

export async function getIssues(_request: AuthenticatedRequest, response: Response) {
  const data = await gd1IssueService.listIssues();
  response.json({ data, errors: [] });
}

export async function postIssue(request: AuthenticatedRequest, response: Response) {
  const data = await gd1IssueService.createIssue(request.body, request.auth?.sub);
  response.status(201).json({ data, errors: [] });
}

export async function getIssue(request: AuthenticatedRequest, response: Response) {
  const data = await gd1IssueService.getIssue(decodeParam(request.params.issueId));
  response.json({ data, errors: [] });
}

export async function postResolveIssue(request: AuthenticatedRequest, response: Response) {
  const { resolutionNote } = request.body;
  const data = await gd1IssueService.resolveIssue(
    decodeParam(request.params.issueId),
    resolutionNote,
    request.auth?.sub
  );
  response.json({ data, errors: [] });
}
