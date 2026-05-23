import type { AppRole, AuthUser } from '@shared/auth/types';
import type { MessageKey } from '@shared/i18n';

export type WorkspaceModule = {
  labelKey: MessageKey;
  path: string;
  roles?: readonly AppRole[];
};

export const workspaceModules = [
  { labelKey: 'shell.dashboard', path: '/' },
  { labelKey: 'shell.workflow', path: '/workflow' },
  { labelKey: 'shell.exchangeRates', path: '/exchange-rates' },
  { labelKey: 'shell.purchaseRequests', path: '/purchase-requests', roles: ['ADMIN', 'PIC_MANAGER', 'SALE_STAFF'] },
  { labelKey: 'shell.purchaseOrders', path: '/purchase-orders', roles: ['ADMIN', 'PIC_MANAGER', 'SALE_STAFF', 'FINANCE_OFFICER'] },
  { labelKey: 'shell.quotations', path: '/quotations', roles: ['ADMIN', 'PIC_MANAGER', 'SALE_STAFF'] },
  { labelKey: 'shell.deliveryOrders', path: '/delivery-orders', roles: ['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'WAREHOUSE_STAFF'] },
  { labelKey: 'shell.efms', path: '/efms', roles: ['ADMIN', 'PIC_MANAGER', 'SALE_STAFF', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'FINANCE_OFFICER', 'WAREHOUSE_STAFF'] },
  { labelKey: 'shell.tasks', path: '/tasks', roles: ['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'FINANCE_OFFICER', 'WAREHOUSE_STAFF'] },
] as const satisfies readonly WorkspaceModule[];

export type WorkspaceModulePath = (typeof workspaceModules)[number]['path'];

export function canUserAccessModule(user: Pick<AuthUser, 'role'>, module: WorkspaceModule) {
  return !module.roles || module.roles.includes(user.role);
}

export function getAllowedWorkspaceModules(user: Pick<AuthUser, 'role'>) {
  return workspaceModules.filter((module) => canUserAccessModule(user, module));
}

export function getPreferredModulePath(user: Pick<AuthUser, 'preferredModulePath' | 'role'>) {
  const preferredModule = user.preferredModulePath
    ? workspaceModules.find((module) => module.path === user.preferredModulePath)
    : undefined;

  if (preferredModule && canUserAccessModule(user, preferredModule)) {
    return preferredModule.path;
  }

  return '/';
}
