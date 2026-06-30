import type { ReactNode } from 'react';

import type { Capability } from './capabilities';
import { useAuth } from './useAuth';

type CanProps = {
  anyOf?: readonly Capability[];
  capability?: Capability;
  children: ReactNode;
  fallback?: ReactNode;
};

export function Can({ anyOf, capability, children, fallback = null }: CanProps) {
  const { can } = useAuth();
  const allowed = capability ? can(capability) : Boolean(anyOf?.some((candidate) => can(candidate)));

  return allowed ? <>{children}</> : <>{fallback}</>;
}
