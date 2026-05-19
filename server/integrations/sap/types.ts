import type { PurchaseOrder } from '../../../src/models/logistics';

export type SapPurchaseOrderPayload = {
  currency: string;
  lines: Array<{
    itemCode: string;
    itemName: string;
    quantity: number;
    sourcePrCode: string;
    unit: string;
    warehouseCode: string;
  }>;
  poNumber: string;
  supplierCode: string;
  supplierName: string;
  totalAmount: number;
  warehouseCode: string;
};

export type SapPurchaseOrderSyncResult = {
  raw: Record<string, unknown>;
  sapObjectId: string;
  status: 'SYNCED' | 'FAILED';
  syncedAt: string;
};

export type SapClient = {
  syncPurchaseOrder: (payload: SapPurchaseOrderPayload) => Promise<SapPurchaseOrderSyncResult>;
};

export function buildSapPurchaseOrderPayload(order: PurchaseOrder): SapPurchaseOrderPayload {
  return {
    currency: order.currency,
    lines: order.line_items.map((line) => ({
      itemCode: line.item_code,
      itemName: line.item_name,
      quantity: line.quantity,
      sourcePrCode: line.source_pr_code,
      unit: line.unit,
      warehouseCode: line.warehouse_code,
    })),
    poNumber: order.po_number,
    supplierCode: order.supplier_code,
    supplierName: order.supplier_name,
    totalAmount: order.total_amount,
    warehouseCode: order.warehouse_code,
  };
}
