import { describe, expect, it } from 'vitest';

import { workspaceModules } from '@shared/navigation/workspaceModules';
import { routeCapabilities } from './routeRoles';

describe('routeCapabilities', () => {
  it('uses the workspace module registry for guarded workspace routes', () => {
    const capabilityByPath = new Map(
      workspaceModules.map((module) => [module.path, module.capability]),
    );

    expect(routeCapabilities.dashboard).toBe(capabilityByPath.get('/'));
    expect(routeCapabilities.quotations).toBe(capabilityByPath.get('/quotations'));
    expect(routeCapabilities.purchaseOrders).toBe(capabilityByPath.get('/purchase-orders'));
    expect(routeCapabilities.deliveryOrders).toBe(capabilityByPath.get('/delivery-orders'));
    expect(routeCapabilities.shipments).toBe(capabilityByPath.get('/shipments'));
    expect(routeCapabilities.domesticTransportOrders).toBe(capabilityByPath.get('/domestic-transport-orders'));
    expect(routeCapabilities.masterData).toBe(capabilityByPath.get('/master-data'));
    expect(routeCapabilities.tasks).toBe(capabilityByPath.get('/tasks'));
  });
});
