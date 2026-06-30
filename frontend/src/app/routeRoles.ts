import type { Capability } from '@shared/auth/capabilities';
import { getWorkspaceModuleByPath } from '@shared/navigation/workspaceModules';

export const routeCapabilities = {
  dashboard: getWorkspaceModuleByPath('/').capability,
  quotations: getWorkspaceModuleByPath('/quotations').capability,
  purchaseOrders: getWorkspaceModuleByPath('/purchase-orders').capability,
  deliveryOrders: getWorkspaceModuleByPath('/delivery-orders').capability,
  shipments: getWorkspaceModuleByPath('/shipments').capability,
  domesticTransportOrders: getWorkspaceModuleByPath('/domestic-transport-orders').capability,
  masterData: getWorkspaceModuleByPath('/master-data').capability,
  tasks: getWorkspaceModuleByPath('/tasks').capability,
  settings: 'settings.view',
} as const satisfies Record<string, Capability>;
