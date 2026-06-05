import type { NextFunction, Response } from 'express';

import type { AppRole } from '../domain/auth';
import type { AuthenticatedRequest } from '../domain/types';
import { rbacService } from '../services/rbac.service';

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

export function authorizeDynamicRoute(moduleName: string) {
  return async (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    const role = request.auth?.role;
    if (!role) {
      response.status(403).json({ data: null, errors: [{ message: 'Vui lòng đăng nhập.' }] });
      return;
    }

    // Admins bypass dynamic RBAC, or configure it via DB. Let's assume ADMIN has all access or requires DB config.
    // For safety, let's just use the DB config for everyone.

    try {
      const permissions = await rbacService.getPermissionsForRole(role);
      const method = request.method;
      const path = request.route?.path || request.path; // e.g. '/' or '/:id'

      // Check if there is a matching permission
      const hasAccess = permissions.some(
        (p) => p.module_name === moduleName && 
               p.can_access === true && 
               (p.method === '*' || p.method === method) &&
               // We might need a better route matching logic, but for now exact match or '*'
               (p.route_path === '*' || p.route_path === path || path.startsWith(p.route_path))
      );

      if (!hasAccess) {
        response.status(403).json({ data: null, errors: [{ message: 'Bạn không có quyền truy cập tài nguyên này trên module ' + moduleName + '.' }] });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
