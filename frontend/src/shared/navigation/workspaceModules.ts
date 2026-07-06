import {
  IconChecklist,
  IconFileInvoice,
  IconFileText,
  IconInbox,
  IconLayoutDashboard,
  IconShip,
  IconShoppingCart,
  IconTruck,
  IconTruckLoading,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';

import { canUserAccessCapability } from '@shared/auth/accessPolicy';
import type { Capability } from '@shared/auth/capabilities';
import type { AuthUser } from '@shared/auth/types';
import type { MessageKey } from '@shared/i18n';

export type WorkspaceModule = {
  capability: Capability;
  icon: ComponentType<{ size?: number | string; stroke?: number | string }>;
  labelKey: MessageKey;
  path: string;
};

type CanCapability = (capability: Capability) => boolean;

export const workspaceModules = [
  { labelKey: 'shell.dashboard', path: '/', capability: 'dashboard.view', icon: IconLayoutDashboard },
  { labelKey: 'shell.quotationRequests', path: '/quotation-requests', capability: 'quotationRequests.view', icon: IconInbox },
  { labelKey: 'shell.quotations', path: '/quotations', capability: 'quotations.view', icon: IconFileInvoice },
  { labelKey: 'shell.purchaseOrders', path: '/purchase-orders', capability: 'purchaseOrders.view', icon: IconShoppingCart },
  { labelKey: 'shell.deliveryOrders', path: '/delivery-orders', capability: 'deliveryOrders.view', icon: IconTruckLoading },
  { labelKey: 'shell.shipments', path: '/shipments', capability: 'shipments.view', icon: IconShip },
  {
    labelKey: 'shell.domesticTransportOrders',
    path: '/domestic-transport-orders',
    capability: 'domesticTransportOrders.view',
    icon: IconTruck,
  },
  { labelKey: 'shell.masterData', path: '/master-data', capability: 'masterData.view', icon: IconFileText },
  { labelKey: 'shell.tasks', path: '/tasks', capability: 'tasks.view', icon: IconChecklist },
] as const satisfies readonly WorkspaceModule[];

export type WorkspaceModulePath = (typeof workspaceModules)[number]['path'];

export function getWorkspaceModuleByPath(path: WorkspaceModulePath) {
  const module = workspaceModules.find((candidate) => candidate.path === path);

  if (!module) {
    throw new Error(`Unknown workspace module path: ${path}`);
  }

  return module;
}

export function canAccessModule(can: CanCapability, module: WorkspaceModule) {
  return can(module.capability);
}

export function canUserAccessModule(user: Pick<AuthUser, 'permissions' | 'role'>, module: WorkspaceModule) {
  return canUserAccessCapability(user, module.capability);
}

export function getAllowedWorkspaceModules(can: CanCapability) {
  return workspaceModules.filter((module) => canAccessModule(can, module));
}

export function getPreferredModulePath(
  preferredModulePath: string | null | undefined,
  can: CanCapability,
) {
  const preferredModule = preferredModulePath
    ? workspaceModules.find((module) => module.path === preferredModulePath)
    : undefined;

  if (preferredModule && canAccessModule(can, preferredModule)) {
    return preferredModule.path;
  }

  return getAllowedWorkspaceModules(can)[0]?.path ?? '/unauthorized';
}

export function getPreferredModulePathForUser(user: Pick<AuthUser, 'permissions' | 'preferredModulePath' | 'role'>) {
  return getPreferredModulePath(user.preferredModulePath, (capability) => canUserAccessCapability(user, capability));
}
