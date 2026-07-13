export type Gd1PoType = 'SEA' | 'AIR' | 'DOMESTIC';

export type Gd1ShipmentMode = 'SEA' | 'AIR' | 'ROAD' | 'RAIL' | 'MULTIMODAL' | 'TRUCKING' | 'OTHER';

export type Gd1CustomsStream = 'GREEN' | 'YELLOW' | 'RED';

export type Gd1MilestoneCode =
  | 'BOOKING_CONFIRMED'
  | 'CARGO_READY'
  | 'PICK_UP'
  | 'PICKED_UP'
  | 'BL_ISSUED'
  | 'GATE_IN_POL'
  | 'ATD'
  | 'CUSTOM_DRAFT_SUBMITTED'
  | 'CUSTOMS_DRAFT'
  | 'AN_ATA'
  | 'ARRIVAL_NOTICE'
  | 'CUSTOM_CLEARED'
  | 'CUSTOMS_CLEARED'
  | 'DELIVERED'
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

export type ShipmentMilestone = {
  id: string;
  milestone_code: Gd1MilestoneCode;
  planned_date: string | null;
  actual_date: string | null;
  source: 'MANUAL' | 'API' | 'EMAIL';
  note: string | null;
};

export type ShipmentDocumentStatus =
  | 'PENDING_UPLOAD'
  | 'WAITING_REVIEW'
  | 'APPROVED'
  | 'DRAFT'
  | 'RECEIVED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'CANCELLED';

export type ShipmentDocument = {
  id: string;
  document_type: string;
  file_name: string | null;
  status: ShipmentDocumentStatus;
  review_due_at?: string;
  reject_reason?: string;
  uploaded_at?: string;
};

export type ShipmentCost = {
  id: string;
  cost_type: Gd1CostType;
  description: string | null;
  amount: number;
  currency_code: string;
  exchange_rate: number;
  alloc_method: Gd1AllocMethod;
  invoice_ref: string | null;
  notes: string | null;
};

export type ShipmentPoTask = {
  id: string;
  task_name: string;
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  assignee_role: string;
};

export type ShipmentStatus =
  | 'BOOKED'
  | 'BOOKING_PENDING'
  | 'BOOKING_CONFIRMED'
  | 'CARGO_READY'
  | 'PICKED_UP'
  | 'BL_ISSUED'
  | 'GATE_IN_POL'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'ARRIVED_PORT'
  | 'CUSTOMS_DRAFT'
  | 'CUSTOMS_CLEARED'
  | 'CUSTOMS_PROCESSING'
  | 'DELIVERED'
  | 'CANCELLED';

export type ShipmentRecord = {
  id: string;
  shipment_number: string;
  do_number: string;
  po_number: string;
  status: ShipmentStatus;
  shipping_mode: Gd1ShipmentMode;
  load_type?: 'FCL' | 'LCL' | 'FTL' | 'LTL' | null;
  carrier_name: string;
  vessel_voyage: string;
  origin_port: string;
  dest_port: string;
  etd: string;
  eta: string;
  atd?: string;
  ata?: string;
  bl_awb_no?: string;
  customs: {
    stream: Gd1CustomsStream;
    declaration_no?: string;
    lane_status: string;
    clearance_date?: string;
  };
  milestones: ShipmentMilestone[];
  documents: ShipmentDocument[];
  costs: ShipmentCost[];
  po_tasks: ShipmentPoTask[];
  // Mirrored from the parent DO's derived "documents complete" gate (source of truth = DO).
  documents_complete?: boolean;
  documents_outstanding?: string[];
  documents_unverified?: string[];
};
