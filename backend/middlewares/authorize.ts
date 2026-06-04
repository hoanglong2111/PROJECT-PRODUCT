import type { NextFunction, Response } from 'express';

import type { AppRole } from '../domain/auth';
import type { AuthenticatedRequest } from '../domain/types';

export function authorizeRole(roles: AppRole[]) {
  return (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    const role = request.auth?.role;
    if (!role || !roles.includes(role)) {
      response.status(403).json({ data: null, errors: [{ message: 'Bạn không có quyền truy cập tài nguyên này.' }] });
      return;
    }

    next();
  };
}
