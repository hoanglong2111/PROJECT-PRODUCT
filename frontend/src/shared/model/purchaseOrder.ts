import type { BusinessFlowTag, Priority, UserRef } from './common';
import type { Gd1PoType } from './shipment';

export type PurchaseRequestStatus =
  | 'NEW'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED_TO_PO'
  | 'CANCELLED';

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'SENT'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'RECEIVED'
  | 'PARTIALLY_DELIVERED'
  | 'CLOSED'
  | 'CANCELLED';

export type PurchaseRequestLineItem = {
  id: string;
  item_code: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price?: number;
  expected_eta?: string | null;
  warehouse_deadline_date: string;
  warehouse_code: string;
  production_contract_number: string;
  linked_po_numbers: string[];
  linked_do_numbers: string[];
};

export type PurchaseOrderLineItem = {
  id: string;
  source_pr_code: string;
  source_pr_line_id: string;
  item_id?: string | null;
  item_code: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price?: number;
  expected_eta?: string | null;
  warehouse_deadline_date: string;
  warehouse_code: string;
  item_group?: string;
  source_reference?: string;
  declaration_type?: string;
  hs_code?: string;
  duty_rate?: number;
  vat_rate?: number;
  tariff_code?: string;
  classification_code?: string;
  co_note?: string;
  tax_note?: string;
  lot_number?: string | null;
};

export type PurchaseOrderLotAllocation = {
  id: string;
  po_line_id: string;
  quantity: number;
};

export type PurchaseOrderLot = {
  id: string;
  lot_no: string;
  do_number?: string;
  allocations: PurchaseOrderLotAllocation[];
};

export type PurchaseOrder = {
  id: string;
  po_number: string;
  source_pr_codes: string[];
  line_items: PurchaseOrderLineItem[];
  supplier_code: string;
  supplier_name: string;
  status: PurchaseOrderStatus;
  order_date: string;
  currency: string;
  total_amount: number;
  sap_sync_status: 'SYNCED' | 'PENDING' | 'FAILED';
  linked_do_numbers: string[];
  lots?: PurchaseOrderLot[];
  po_type?: Gd1PoType;
  incoterm?: string;
  payment_term?: string;
  expected_etd?: string | null;
  expected_eta?: string | null;
  version?: number;
  sent_at?: string | null;
  confirmed_date?: string | null;
  warehouse_code: string;
  flow_tags: BusinessFlowTag[];
};

export type PurchaseRequest = {
  id: string;
  requested_order_id: string;
  item_code: string;
  item_name: string;
  quantity: number;
  unit: string;
  priority: Priority;
  requested_order_date: string;
  adjusted_date: string | null;
  warehouse_deadline_date: string;
  production_contract_number: string;
  requester: UserRef;
  purchasing_manager: UserRef;
  status: PurchaseRequestStatus;
  notes: string;
  line_items: PurchaseRequestLineItem[];
  actual_warehouse_entry_date: string | null;
  supplier_expected_delivery_date: string | null;
  expected_arrival_date: string | null;
  delay_days: number;
  linked_po_numbers: string[];
  linked_do_numbers: string[];
  lots?: PurchaseOrderLot[];
  po_type?: Gd1PoType;
  incoterm?: string;
  payment_term?: string;
  expected_etd?: string | null;
  expected_eta?: string | null;
  version?: number;
  sent_at?: string | null;
  confirmed_date?: string | null;
  warehouse_code: string;
  flow_tags: BusinessFlowTag[];
};
