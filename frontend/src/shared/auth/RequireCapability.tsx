import { Navigate } from 'react-router-dom';

import type { Capability } from './capabilities';
import { useAuth } from './useAuth';

export function RequireCapability({
  capability,
  children,
}: {
  capability: Capability;
  children: React.ReactNode;
}) {
  const { can, user } = useAuth();

  if (!user || !can(capability)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
