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

import type { AuthUser } from '@shared/auth/types';
import type { MessageKey } from '@shared/i18n';

export type WorkspaceModule = {
  icon: ComponentType<{ size?: number | string; stroke?: number | string }>;
  labelKey: MessageKey;
  path: string;
};

export const workspaceModules = [
  { labelKey: 'shell.dashboard', path: '/', icon: IconLayoutDashboard },
  { labelKey: 'shell.quotationRequests', path: '/quotation-requests', icon: IconInbox },
  { labelKey: 'shell.quotations', path: '/quotations', icon: IconFileInvoice },
  { labelKey: 'shell.purchaseOrders', path: '/purchase-orders', icon: IconShoppingCart },
  { labelKey: 'shell.deliveryOrders', path: '/delivery-orders', icon: IconTruckLoading },
  { labelKey: 'shell.shipments', path: '/shipments', icon: IconShip },
  {
    labelKey: 'shell.domesticTransportOrders',
    path: '/domestic-transport-orders',
    icon: IconTruck,
  },
  { labelKey: 'shell.masterData', path: '/master-data', icon: IconFileText },
  { labelKey: 'shell.tasks', path: '/tasks', icon: IconChecklist },
] as const satisfies readonly WorkspaceModule[];

export type WorkspaceModulePath = (typeof workspaceModules)[number]['path'];

export function getAllowedWorkspaceModules() {
  return workspaceModules;
}

export function getPreferredModulePath(preferredModulePath: string | null | undefined) {
  const preferredModule = preferredModulePath
    ? workspaceModules.find((module) => module.path === preferredModulePath)
    : undefined;

  return preferredModule?.path ?? workspaceModules[0]?.path ?? '/';
}

export function getPreferredModulePathForUser(user: Pick<AuthUser, 'preferredModulePath'>) {
  return getPreferredModulePath(user.preferredModulePath);
}
