export const CAPABILITIES = [
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
  'settings.manageUsers',
] as const;

export type Capability = (typeof CAPABILITIES)[number];
