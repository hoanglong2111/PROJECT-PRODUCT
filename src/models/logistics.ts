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
  item_code: string;
  item_name: string;
  quantity: number;
  unit: string;
  warehouse_deadline_date: string;
  warehouse_code: string;
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

export type LogisticsTask = {
  task_id: string;
  do_number: string;
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
