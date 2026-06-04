import type { SapClient, SapPurchaseOrderPayload } from './types';

export class MockSapClient implements SapClient {
  async syncPurchaseOrder(payload: SapPurchaseOrderPayload) {
    const now = new Date().toISOString();
    const sapObjectId = `SAP-${payload.poNumber}`;

    return {
      raw: {
        message: 'Mock SAP sync completed.',
        mode: 'mock',
        poNumber: payload.poNumber,
        sapObjectId,
        syncedAt: now,
      },
      sapObjectId,
      status: 'SYNCED' as const,
      syncedAt: now,
    };
  }
}
