import { isDemoHidden } from '@shared/config/featureFlags';
import { CAPABILITIES, type Capability } from './capabilities';
import type { AppRole, AuthUser } from './types';

const knownCapabilities = new Set<Capability>(CAPABILITIES);

const managerCapabilities = [
  'dashboard.view',
  'quotationRequests.view',
  'quotationRequests.manage',
  'quotations.view',
  'quotations.manage',
  'purchaseOrders.view',
  'purchaseOrders.manage',
  'purchaseOrders.delete',
  'deliveryOrders.view',
  'deliveryOrders.manage',
  'shipments.view',
  'shipments.manage',
  'domesticTransportOrders.view',
  'domesticTransportOrders.manage',
  'masterData.view',
  'masterData.manage',
  'tasks.view',
  'tasks.manage',
  'settings.view',
] as const satisfies readonly Capability[];

const salesCapabilities = [
  'dashboard.view',
  'quotationRequests.view',
  'quotationRequests.manage',
  'quotations.view',
  'quotations.manage',
  'purchaseOrders.view',
  'settings.view',
] as const satisfies readonly Capability[];

const portCapabilities = [
  'dashboard.view',
  'deliveryOrders.view',
  'deliveryOrders.manage',
  'shipments.view',
  'shipments.manage',
  'domesticTransportOrders.view',
  'domesticTransportOrders.manage',
  'tasks.view',
  'tasks.manage',
  'settings.view',
] as const satisfies readonly Capability[];

const customsCapabilities = [
  'dashboard.view',
  'deliveryOrders.view',
  'deliveryOrders.manage',
  'shipments.view',
  'shipments.manage',
  'domesticTransportOrders.view',
  'domesticTransportOrders.manage',
  'tasks.view',
  'tasks.manage',
  'settings.view',
] as const satisfies readonly Capability[];

const financeCapabilities = [
  'dashboard.view',
  'quotationRequests.view',
  'quotations.view',
  'purchaseOrders.view',
  'shipments.view',
  'domesticTransportOrders.view',
  'tasks.view',
  'settings.view',
] as const satisfies readonly Capability[];

const warehouseCapabilities = [
  'dashboard.view',
  'deliveryOrders.view',
  'deliveryOrders.manage',
  'shipments.view',
  'shipments.manage',
  'domesticTransportOrders.view',
  'domesticTransportOrders.manage',
  'tasks.view',
  'tasks.manage',
  'settings.view',
] as const satisfies readonly Capability[];

export const ROLE_CAPABILITIES = {
  ADMIN: [...managerCapabilities, 'settings.manageUsers'],
  PIC_MANAGER: managerCapabilities,
  SALE_STAFF: salesCapabilities,
  PORT_OFFICER: portCapabilities,
  CUSTOMS_OFFICER: customsCapabilities,
  FINANCE_OFFICER: financeCapabilities,
  WAREHOUSE_STAFF: warehouseCapabilities,
} as const satisfies Record<AppRole, readonly Capability[]>;

export function capabilitiesForRole(role: AppRole): readonly Capability[] {
  return ROLE_CAPABILITIES[role];
}

export function capabilitiesForUser(user: Pick<AuthUser, 'permissions' | 'role'>): readonly Capability[] {
  return user.permissions ?? capabilitiesForRole(user.role);
}

export function canUserAccessCapability(
  user: Pick<AuthUser, 'permissions' | 'role'>,
  capability: Capability,
) {
  return (
    knownCapabilities.has(capability) &&
    capabilitiesForUser(user).includes(capability) &&
    !isDemoHidden(capability)
  );
}
