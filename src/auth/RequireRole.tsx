import { Navigate } from 'react-router-dom';

import { useAuth } from './useAuth';
import type { AppRole } from './types';

export function RequireRole({
  allowedRoles,
  children,
}: {
  allowedRoles: AppRole[];
  children: React.ReactNode;
}) {
  const { hasAnyRole, user } = useAuth();

  if (!user || !hasAnyRole(allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
