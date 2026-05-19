import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';

import { APP_ROLES, type AppRole, type AuthUser } from '../src/auth/types';
import { JWT_SECRET } from './constants';
import type { AppUserRow, AuthenticatedRequest, TokenPayload } from './types';

export function authenticateRequest(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  const authorizationHeader = request.headers.authorization;
  const token = authorizationHeader?.startsWith('Bearer ') ? authorizationHeader.slice(7) : null;

  if (!token) {
    response.status(401).json({ data: null, errors: [{ message: 'Thiếu token xác thực.' }] });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || typeof decoded !== 'object' || !APP_ROLES.includes((decoded as TokenPayload).role)) {
      response.status(401).json({ data: null, errors: [{ message: 'Token không hợp lệ.' }] });
      return;
    }
    request.auth = decoded as TokenPayload;
    next();
  } catch {
    response.status(401).json({ data: null, errors: [{ message: 'Token không hợp lệ hoặc đã hết hạn.' }] });
  }
}

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

export function toAuthUser(user: AppUserRow): AuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    position: user.position,
    department: user.department,
    avatarUrl: user.avatar_url,
  };
}
