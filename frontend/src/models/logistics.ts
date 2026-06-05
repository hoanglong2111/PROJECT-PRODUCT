export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type PurchaseRequestStatus =
  | 'NEW'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED_TO_PO'
  | 'CANCELLED';

export type DeliveryOrderStatus =
  | 'CREATED'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'IN_TRANSIT'
  | 'ARRIVED_PORT'
  | 'CUSTOMS_PROCESSING'
  | 'WAREHOUSE_PENDING'
  | 'DELIVERED'
  | 'DELAYED'
  | 'CANCELLED';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'WAITING' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';

export type TaskRole =
  | 'PIC Manager'
  | 'Sale Staff'
  | 'Port Officer'
  | 'Customs Officer'
  | 'Finance Officer'
  | 'Warehouse Staff';

export type UserRef = {
  user_id: string;
  name: string;
  department: string;
};

export type PurchaseOrderStatus = 'SAP_SYNCED' | 'SAP_PENDING' | 'PARTIALLY_DELIVERED' | 'CLOSED';

export type ShippingMode = 'AIR' | 'FCL' | 'LCL';

export type QuotationStatus =
  | 'DRAFT'
  | 'PRELIMINARY_SENT'
  | 'OFFICIAL_SENT'
  | 'APPROVED'
  | 'REJECTED'
  | 'REVISION_REQUESTED'
  | 'BOOKED';

export type DocumentReviewStatus =
  | 'WAITING_DOCUMENTS'
  | 'READY_FOR_CHECK'
  | 'MISMATCH'
  | 'DRAFT_BL_CONFIRMED'
  | 'FINAL_BL_CONFIRMED';

export type FinanceChargeType = 'SELLING' | 'BUYING' | 'OBH';

export type CustomsChannel = 'GREEN' | 'YELLOW' | 'RED';
export type MblType = 'COPY' | 'ORIGINAL' | 'SEAWAY_BILL' | 'SURRENDERED';
export type SlaStatus = 'ON_TRACK' | 'OVERDUE' | 'DONE';

export type CustomsStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'CLEARED'
  | 'NEEDS_DOCUMENTS'
  | 'INSPECTION'
  | 'VIOLATION_HANDLING';

export type CustomsLaneStatus =
  | 'GREEN_CLEARANCE'
  | 'YELLOW_NEED_SUPPLEMENT'
  | 'RED_FIELD_INSPECTION'
  | 'RED_VIOLATION_HANDLING'
  | 'RELEASE_READY';

export type AdvanceSettlementStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'SETTLED';
export type DriveDossierStatus = 'READY' | 'PENDING_CONFIG' | 'BLOCKED' | 'SYNCED' | 'FAILED';

export type BusinessFlowTag =
  | 'LINEAR'
  | 'BULK_PURCHASE'
  | 'SPLIT_PURCHASE'
  | 'PARTIAL_DELIVERY'
  | 'CONTAINER_CONSOLIDATION';

export type PurchaseRequestLineItem = {
  id: string;
  item_code: string;
  item_name: string;
  quantity: number;
  unit: string;
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
};

export type DeliverySourceLine = {
  id: string;
  po_number: string;
  po_line_id: string;
  request_code: string;
  pr_line_id: string;
  item_code: string;
  item_name: string;
  quantity: number;
  unit: string;
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
  warehouse_code: string;
  flow_tags: BusinessFlowTag[];
};

export type Quotation = {
  id: string;
  quoteNumber: string;
  requestCode: string;
  shippingMode: ShippingMode;
  status: QuotationStatus;
  preliminaryDueAt: string;
  preliminarySentAt: string | null;
  officialDueAt: string;
  officialSentAt: string | null;
  autoApproveAt: string | null;
  customerResponseAt: string | null;
  quoteAmount: number | string | null;
  currency: string | null;
  bookingNumber: string | null;
  bookingConfirmedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
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
  warehouse_code: string;
  flow_tags: BusinessFlowTag[];
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

export type LogisticsTask = {
  task_id: string;
  do_number: string;
  hbl_number: string | null;
  request_code: string;
  po_number: string | null;
  production_contract_number: string;
  task_name: string;
  role: TaskRole;
  assignee: UserRef;
  progress: number;
  created_at: string;
  assigned_at: string | null;
  completed_at: string | null;
  status: TaskStatus;
  priority: Priority;
  due_date: string;
  notes: string;
  is_required_for_do_closure: boolean;
  blocked_reason: string | null;
};

// ============================================================================
// GD1 CANONICAL TYPEDEF LAYER
// ============================================================================

export type Gd1Priority = 'NORMAL' | 'HIGH' | 'URGENT';

export type Gd1PrStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PARTIALLY_APPROVED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED'
  | 'CLOSED'
  | 'CANCELLED';

export type Gd1PoStatus =
  | 'DRAFT'
  | 'SENT'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'RECEIVED'
  | 'CLOSED'
  | 'CANCELLED';

export type Gd1PoLineStatus = 'OPEN' | 'PARTIALLY_SHIPPED' | 'SHIPPED' | 'RECEIVED' | 'CLOSED' | 'CANCELLED';

export type Gd1PoType = 'SEA' | 'AIR' | 'DOMESTIC';
export type Gd1TemplatePoType = 'SEA' | 'AIR' | 'DOMESTIC' | 'ALL';
export type Gd1ShipmentMode = 'SEA' | 'AIR';

export type Gd1ShipmentStatus =
  | 'BOOKING_PENDING'
  | 'BOOKING_CONFIRMED'
  | 'CARGO_READY'
  | 'PICKED_UP'
  | 'BL_ISSUED'
  | 'GATE_IN_POL'
  | 'IN_TRANSIT'
  | 'CUSTOMS_DRAFT'
  | 'ARRIVED'
  | 'CUSTOMS_CLEARED'
  | 'DELIVERED'
  | 'CANCELLED';

export type Gd1CustomsStream = 'GREEN' | 'YELLOW' | 'RED';

export type Gd1MilestoneCode =
  | 'BOOKING_CONFIRMED'
  | 'CARGO_READY'
  | 'PICK_UP'
  | 'BL_ISSUED'
  | 'GATE_IN_POL'
  | 'ATD'
  | 'CUSTOM_DRAFT_SUBMITTED'
  | 'AN_ATA'
  | 'CUSTOM_CLEARED'
  | 'EDO_DELIVERY';

export type Gd1MilestoneSource = 'MANUAL' | 'API' | 'EMAIL';

export type Gd1CostType =
  | 'FREIGHT'
  | 'INSURANCE'
  | 'CUSTOMS_DUTY'
  | 'VAT'
  | 'LOCAL_CHARGES'
  | 'DEMURRAGE'
  | 'OTHER';

export type Gd1AllocMethod = 'BY_VALUE' | 'BY_WEIGHT' | 'BY_QTY';

export type Gd1TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED' | 'CANCELLED';

export type Gd1AssigneeRole = 'BUYER' | 'LOGISTICS' | 'FINANCE' | 'CUSTOMS_BROKER';
export type Gd1ApproverRole = 'DEPARTMENT_MANAGER' | 'DIVISION_DIRECTOR' | 'CEO' | 'CFO';
export type Gd1ApprovalAppliesTo = 'PR' | 'PO' | 'BOTH';

export interface Gd1PurchaseRequest {
  id: string;
  tenant_id: string;
  pr_no: string;
  title: string;
  requester_id: string | null;
  department_id: string | null;
  priority: Gd1Priority;
  status: Gd1PrStatus;
  required_date: string;
  total_amount: number;
  currency_code: string;
  notes: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  version: number;
  deleted_at: string | null;
}

export interface Gd1PurchaseRequestLine {
  id: string;
  tenant_id: string;
  purchase_request_id: string;
  item_id: string;
  line_no: number;
  qty_requested: number;
  qty_converted: number;
  unit: string;
  target_price: number | null;
  currency_code: string;
  required_date: string;
  preferred_supplier_id: string | null;
  note: string | null;
}

export interface Gd1ApprovalMatrixConfig {
  id: string;
  tenant_id: string;
  applies_to: Gd1ApprovalAppliesTo;
  department_id: string | null;
  min_amount: number;
  max_amount: number | null;
  currency_code: string;
  step_order: number;
  approver_role: Gd1ApproverRole;
  approver_user_id: string | null;
  escalation_timeout_hours: number;
  is_active: boolean;
}

export interface Gd1PurchaseOrder {
  id: string;
  tenant_id: string;
  po_no: string;
  revision: number;
  supplier_id: string;
  po_type: Gd1PoType;
  incoterm: string;
  payment_term: string;
  currency_code: string;
  exchange_rate: number;
  status: Gd1PoStatus;
  expected_etd: string | null;
  expected_eta: string | null;
  confirmed_by_supplier_at: string | null;
  supplier_ref_no: string | null;
  tolerance_over_pct: number;
  tolerance_under_pct: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Gd1PurchaseOrderLine {
  id: string;
  tenant_id: string;
  purchase_order_id: string;
  purchase_request_line_id: string | null;
  item_id: string;
  line_no: number;
  status: Gd1PoLineStatus;
  qty_ordered: number;
  qty_shipped: number;
  qty_received: number;
  unit_price: number;
  tax_rate: number;
  discount_pct: number;
  landed_cost_alloc: number;
  expected_eta_line: string | null;
}

export interface Gd1ShipmentMilestone {
  id: string;
  tenant_id: string | null;
  shipment_id: string;
  sequence_no: number;
  milestone_code: Gd1MilestoneCode;
  planned_date: string | null;
  actual_date: string | null;
  recorded_by: string | null;
  source: Gd1MilestoneSource;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Gd1ShipmentCost {
  id: string;
  tenant_id: string | null;
  shipment_id: string;
  cost_type: Gd1CostType;
  amount: number;
  currency_code: string;
  exchange_rate: number;
  alloc_method: Gd1AllocMethod;
  invoice_ref: string | null;
}

export interface Gd1PoTaskTemplate {
  id: string;
  tenant_id: string | null;
  po_type: Gd1TemplatePoType;
  po_stage: Gd1PoStatus;
  task_name: string;
  default_assignee_role: Gd1AssigneeRole;
  sla_hours: number;
  linked_milestone: Gd1MilestoneCode | null;
  is_active: boolean;
  sort_order: number;
}

export interface Gd1PoStageTask {
  id: string;
  tenant_id: string | null;
  purchase_order_id: string;
  po_stage: Gd1PoStatus;
  task_name: string;
  task_template_id: string | null;
  assignee_id: string;
  assigned_by: string;
  status: Gd1TaskStatus;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  linked_shipment_milestone: Gd1MilestoneCode | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Gd1ApprovalStep {
  id: string;
  tenant_id: string | null;
  entity_type: string;
  entity_id: string;
  step_order: number;
  approver_role: string;
  approver_id: string | null;
  status: 'PENDING' | 'WAITING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  note: string | null;
  decision_at: string | null;
  created_at: string;
  updated_at: string;
}

