import type { Capability } from './capabilities';
import { useAuth } from './useAuth';

export function useCan(capability: Capability) {
  const { can } = useAuth();
  return can(capability);
}

export function useCanAny(capabilities: readonly Capability[]) {
  const { can } = useAuth();
  return capabilities.some((capability) => can(capability));
}
