import { PurchaseOrderLineV1, PurchaseOrderV1 } from '../purchaseOrders';
import { BusinessFlowTag, PurchaseOrder, PurchaseOrderLineItem, PurchaseOrderStatus } from '@shared/model/logistics';
import { dateOnly, toNumber, uiId } from './mapperShared';

export type CreatePurchaseOrderPayload = {
  currency: string;
  expectedEta?: string | null;
  expectedEtd?: string | null;
  incoterm?: string;
  orderDate?: string;
  paymentTerm?: string;
  poNumber: string;
  poType?: string;
  sourceLines?: Array<{
    classificationCode?: string;
    coNote?: string;
    declarationType?: string;
    dutyRate?: number;
    hsCode?: string;
    itemCode?: string;
    itemGroup?: string;
    itemName?: string;
    quantity?: number;
    sourceReference?: string;
    tariffCode?: string;
    taxNote?: string;
    unit?: string;
    vatRate?: number;
    lotNumber?: string;
    itemId?: string;
    expectedEta?: string | null;
    unitPrice?: number;
  }>;
  supplierCode: string;
  supplierName: string;
  totalAmount: number;
  warehouseCode: string;
};

export function inferPoFlowTags(purchaseOrder: PurchaseOrderV1): BusinessFlowTag[] {
  if ((purchaseOrder.lines ?? []).some((line) => toNumber(line.qty_lotted) > 0 && toNumber(line.qty_lotted) < toNumber(line.qty_ordered))) {
    return ['PARTIAL_DELIVERY'];
  }
  return ['LINEAR'];
}

export function mapV1PurchaseOrderLine(line: PurchaseOrderLineV1): PurchaseOrderLineItem {
  const item = line.item;
  const customsProfile = line.item_customs_profile;

  return {
    classification_code: customsProfile?.customs_type ?? undefined,
    co_note: customsProfile?.co_tax_note ?? undefined,
    declaration_type: customsProfile?.customs_type ?? undefined,
    duty_rate: toNumber(customsProfile?.import_duty_rate),
    expected_eta: dateOnly(line.expected_eta_line) || null,
    hs_code: customsProfile?.hs_code ?? undefined,
    id: line.id,
    item_code: item?.item_code ?? line.item_id,
    item_group: undefined,
    item_id: line.item_id,
    item_name: item?.item_name ?? line.item_description ?? '',
    lot_number: null,
    quantity: toNumber(line.qty_ordered),
    source_pr_code: '',
    source_pr_line_id: '',
    source_reference: line.purchase_order_id,
    tariff_code: customsProfile?.reference_doc_no ?? undefined,
    tax_note: customsProfile?.tax_note ?? undefined,
    unit: line.unit ?? '',
    unit_price: toNumber(line.unit_price),
    vat_rate: toNumber(customsProfile?.vat_rate),
    warehouse_code: '',
    warehouse_deadline_date: dateOnly(line.expected_eta_line),
  };
}

export function mapV1PurchaseOrder(purchaseOrder: PurchaseOrderV1, linkedDoNumbers: string[] = []): PurchaseOrder {
  const lineItems = (purchaseOrder.lines ?? []).map(mapV1PurchaseOrderLine);
  const totalAmount = lineItems.reduce(
    (total, line) => total + line.quantity * toNumber(line.unit_price),
    0,
  );

  return {
    currency: purchaseOrder.currency?.currency_code ?? '',
    expected_eta: dateOnly(purchaseOrder.expected_eta) || null,
    expected_etd: dateOnly(purchaseOrder.expected_etd) || null,
    flow_tags: inferPoFlowTags(purchaseOrder),
    id: purchaseOrder.id,
    incoterm: purchaseOrder.incoterm?.incoterm_code ?? undefined,
    line_items: lineItems,
    linked_do_numbers: linkedDoNumbers,
    lots: [],
    order_date: dateOnly(purchaseOrder.create_at),
    payment_term: purchaseOrder.payment_term ?? undefined,
    po_number: purchaseOrder.po_no,
    po_type: purchaseOrder.po_type as PurchaseOrder['po_type'],
    sap_sync_status: 'SYNCED',
    sent_at: purchaseOrder.sent_at,
    source_pr_codes: [],
    status: purchaseOrder.status as PurchaseOrderStatus,
    supplier_code: purchaseOrder.supplier?.supplier_code ?? purchaseOrder.supplier_id,
    supplier_name: purchaseOrder.supplier?.supplier_name ?? '',
    total_amount: totalAmount,
    version: 1,
    warehouse_code: '',
    confirmed_date: purchaseOrder.confirmed_at,
  };
}

export function buildUiPurchaseOrder(payload: CreatePurchaseOrderPayload): PurchaseOrder {
  return {
    id: uiId('po'),
    po_number: payload.poNumber,
    source_pr_codes: [],
    line_items: [],
    supplier_code: payload.supplierCode,
    supplier_name: payload.supplierName,
    status: 'DRAFT',
    order_date: payload.orderDate || new Date().toISOString().slice(0, 10),
    currency: payload.currency,
    total_amount: payload.totalAmount,
    sap_sync_status: 'PENDING',
    linked_do_numbers: [],
    lots: [],
    po_type: payload.poType as PurchaseOrder['po_type'],
    incoterm: payload.incoterm,
    payment_term: payload.paymentTerm,
    expected_etd: payload.expectedEtd ?? null,
    expected_eta: payload.expectedEta ?? null,
    version: 1,
    sent_at: null,
    confirmed_date: null,
    warehouse_code: payload.warehouseCode,
    flow_tags: ['LINEAR'],
  };
}
