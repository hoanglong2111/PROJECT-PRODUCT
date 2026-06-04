import type { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from '../domain/types';
import { verifyAccessToken } from '../utils/token';

export function authenticateRequest(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  const authorizationHeader = request.headers.authorization;
  const token = authorizationHeader?.startsWith('Bearer ') ? authorizationHeader.slice(7) : null;

  if (!token) {
    response.status(401).json({ data: null, errors: [{ message: 'Thiếu token xác thực.' }] });
    return;
  }

  try {
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      response.status(401).json({ data: null, errors: [{ message: 'Token không hợp lệ.' }] });
      return;
    }

    request.auth = decoded;
    next();
  } catch {
    response.status(401).json({ data: null, errors: [{ message: 'Token không hợp lệ hoặc đã hết hạn.' }] });
  }
}
