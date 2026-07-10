import type { AdvanceSettlementStatus, BusinessFlowTag, CustomsChannel, CustomsLaneStatus, CustomsStatus, DocumentReviewStatus, DriveDossierStatus, FinanceChargeType, MblType, SlaStatus } from './common';
import type { TaskRole } from './task';

export type DeliveryOrderStatus =
  | 'DRAFT'
  | 'CREATED'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'READY_TO_SHIP'
  | 'IN_TRANSIT'
  | 'ARRIVED_PORT'
  | 'CUSTOMS_PROCESSING'
  | 'CUSTOMS_CLEARED'
  | 'WAREHOUSE_PENDING'
  | 'DELIVERED'
  | 'CLOSED'
  | 'DELAYED'
  | 'READY_FOR_QUOTATION'
  | 'QUOTATION_CONFIRMED'
  | 'ASSIGNED_TO_SHIPMENT'
  | 'CANCELLED';

export type DeliverySourceLine = {
  id: string;
  do_number?: string;
  lot_number?: string | null;
  shipment_number?: string | null;
  po_number: string;
  po_line_id: string;
  request_code: string;
  pr_line_id: string;
  item_code: string;
  item_name: string;
  hs_code?: string | null;
  quantity: number;
  ordered_quantity?: number | null;
  unit: string;
  weight_kg?: number | null;
  container_count?: number | null;
  container_no?: string | null;
  route_origin?: string | null;
  route_destination?: string | null;
  etd?: string | null;
  eta?: string | null;
};

export type DeliveryOrder = {
  id: string;
  order_info: {
    request_code: string;
    order_number: string;
    tracking_number: string | null;
    purchase_contract_number: string;
    status: DeliveryOrderStatus;
    notes: string;
    xnk_notes: string;
  };
  product_details: {
    item_name_requested: string;
    unit: string;
    quantity: number;
    lot_number: string | null;
    lot_unit_quantity: number | null;
    lot_unit_type: string | null;
    packaging_type: string | null;
  };
  source_lines: DeliverySourceLine[];
  sap_integration: {
    supplier_code: string | null;
    supplier_name: string | null;
    actual_item_code: string | null;
    raw_date: string | null;
    po_number: string | null;
    sync_status: 'SYNCED' | 'SYNC_INCOMPLETE' | 'SYNC_FAILED';
  };
  source_po_number?: string;
  source_lot_id?: string;
  source_lot_no?: string;
  linked_shipment_number?: string | null;
  logistics_shipping: {
    incoterms: string;
    shipping_method: 'SEA' | 'AIR' | 'ROAD';
    shipping_line: string | null;
    vessel_code: string | null;
    port_of_departure: string;
    port_of_destination: string;
    documents_list: string[];
    missing_documents: string[];
    cut_off_date: string | null;
    etd_planned: string | null;
    eta_planned: string | null;
  };
  warehouse_tracking: {
    warehouse_code: string;
    production_ready_date: string | null;
    warehouse_deadline: string;
    planned_entry_date: string | null;
    actual_entry_date: string | null;
    delay_days: number;
  };
  finance_tax: {
    import_tax_rate: number | null;
    tax_amount: number | null;
    currency: string;
    tax_payment_deadline: string | null;
    insurance: {
      provider: string;
      policy_number: string;
      insured_amount: number;
      currency: string;
    } | null;
  };
  task_summary: {
    total_tasks: number;
    completed_tasks: number;
    blocked_tasks: number;
    required_tasks_remaining: number;
  };
  flow_tags: BusinessFlowTag[];
};

export type EfmsTransportRecord = {
  id: string;
  deliveryOrderId: string;
  incoterms: string;
  shippingMethod: DeliveryOrder['logistics_shipping']['shipping_method'];
  shippingLine: string | null;
  vesselCode: string | null;
  bookingNumber: string | null;
  mblNumber: string | null;
  mblType: MblType | null;
  hblNumber: string | null;
  manifestNumber: string | null;
  portOfDeparture: string;
  portOfDestination: string;
  cutOffDate: string | null;
  etdPlanned: string | null;
  etaPlanned: string | null;
  actualDepartureAt: string | null;
  actualArrivalAt: string | null;
  documentsList: string[];
  missingDocuments: string[];
  grossWeight: number | string | null;
  cbm: number | string | null;
};

export type EfmsContainer = {
  id: string;
  deliveryOrderId: string;
  containerType: string;
  containerNumber: string;
  sealNumber: string | null;
  vehicleType: string | null;
  vehicleNumber: string | null;
};

export type EfmsHouseBill = {
  id: string;
  deliveryOrderId: string;
  hblNumber: string;
  shipper: string;
  consignee: string;
  placeOfReceipt: string | null;
  placeOfDelivery: string | null;
  assignedTo: string | null;
  finalBlConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentReview = {
  id: string;
  deliveryOrderId: string;
  hblNumber: string | null;
  status: DocumentReviewStatus;
  draftBlAttachmentId: string | null;
  commercialInvoiceAttachmentId: string | null;
  packingListAttachmentId: string | null;
  finalBlAttachmentId: string | null;
  crossCheckDueAt: string;
  crossCheckedAt: string | null;
  slaStatus: SlaStatus;
  isOverdue: boolean;
  notes: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FinanceCharge = {
  id: string;
  deliveryOrderId: string;
  chargeType: FinanceChargeType;
  chargeCode: string;
  description: string;
  amount: number | string;
  currency: string;
  isLocked: boolean;
  invoicedNoteId: string | null;
  invoicedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FinanceNote = {
  id: string;
  deliveryOrderId: string;
  noteNumber: string;
  noteType: string;
  accountingCode: 'S' | 'B' | 'OBH';
  status: string;
  chargeIds: string[];
  slaDueAt: string | null;
  slaStatus: SlaStatus;
  issuedAt: string | null;
  sentToAccountingAt: string | null;
};

export type CustomsDeclaration = {
  id: string;
  deliveryOrderId: string;
  declarationNumber: string | null;
  channel: CustomsChannel | null;
  status: CustomsStatus;
  laneStatus: CustomsLaneStatus | null;
  telexReleased: boolean;
  telexReleasedAt: string | null;
  submittedAt: string | null;
  clearedAt: string | null;
  notes: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  canDispatch: boolean;
  nextAction: string;
};

export type AdvanceSettlement = {
  id: string;
  deliveryOrderId: string;
  hblNumber: string | null;
  settlementNumber: string;
  requestedBy: string | null;
  assignedRole: TaskRole;
  amount: number | string;
  currency: string;
  purpose: string;
  status: AdvanceSettlementStatus;
  approvedBy: string | null;
  settledBy: string | null;
  requestedAt: string;
  approvedAt: string | null;
  settledAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type DriveDossier = {
  id: string;
  deliveryOrderId: string;
  dossierNumber: string;
  status: DriveDossierStatus;
  requiredDocuments: string[];
  missingDocuments: string[];
  externalFolderUrl: string | null;
  errorMessage: string | null;
  requestedBy: string | null;
  syncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EfmsControl = {
  advanceSettlements: AdvanceSettlement[];
  charges: FinanceCharge[];
  containers: EfmsContainer[];
  customs: CustomsDeclaration | null;
  documentReviews: DocumentReview[];
  financeNotes: FinanceNote[];
  houseBills: EfmsHouseBill[];
  latestDriveDossier: DriveDossier | null;
  transport: EfmsTransportRecord | null;
};

// Snapshot of the SOP Task Template (master data) a runtime task is generated from.
// Lets the Tasks screen surface milestone / department / SLA / required documents
// without re-deriving the SOP knowledge that lives in the master-data catalog.
