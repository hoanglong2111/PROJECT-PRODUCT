export interface ShipmentMilestone {
  id: string;
  milestone_code: string;
  planned_date: string | null;
  actual_date: string | null;
  source: 'MANUAL' | 'API' | 'EMAIL';
  note: string | null;
}

export interface ShipmentDocument {
  id: string;
  document_type: string;
  file_name: string | null;
  status: 'PENDING_UPLOAD' | 'WAITING_REVIEW' | 'APPROVED' | 'REJECTED';
  review_due_at?: string; // For 2h SLA
  reject_reason?: string;
  uploaded_at?: string;
}

export interface ShipmentRecord {
  id: string;
  shipment_number: string;
  do_number: string;
  po_number: string;
  status: 'BOOKED' | 'IN_TRANSIT' | 'ARRIVED_PORT' | 'CUSTOMS_PROCESSING' | 'DELIVERED';
  shipping_mode: 'SEA' | 'AIR';
  carrier_name: string;
  vessel_voyage: string;
  origin_port: string;
  dest_port: string;
  etd: string;
  eta: string;
  customs: {
    stream: 'GREEN' | 'YELLOW' | 'RED';
    declaration_no?: string;
    lane_status: string;
    clearance_date?: string;
  };
  milestones: ShipmentMilestone[];
  documents: ShipmentDocument[];
  po_tasks: {
    id: string;
    task_name: string;
    status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
    assignee_role: string;
  }[];
}

export const mockShipments: ShipmentRecord[] = [
  {
    id: 'shp-1001',
    shipment_number: 'SHP-2026-0001',
    do_number: 'DO-2026-000001',
    po_number: 'PO-2026-000001',
    status: 'IN_TRANSIT',
    shipping_mode: 'SEA',
    carrier_name: 'Maersk Line',
    vessel_voyage: 'MAERSK EVOLUTION V102',
    origin_port: 'Shanghai (CNSHA)',
    dest_port: 'Cat Lai (VNCLI)',
    etd: '2026-06-01',
    eta: '2026-06-15',
    customs: {
      stream: 'YELLOW',
      declaration_no: '300123456789',
      lane_status: 'Chờ bổ sung chứng từ',
    },
    milestones: [
      { id: 'm1', milestone_code: 'BOOKING_CONFIRMED', planned_date: '2026-05-28', actual_date: '2026-05-28', source: 'API', note: 'Booking confirmed with Maersk' },
      { id: 'm2', milestone_code: 'CARGO_READY', planned_date: '2026-05-30', actual_date: '2026-05-30', source: 'MANUAL', note: 'Cargo ready at factory gate' },
      { id: 'm3', milestone_code: 'PICK_UP', planned_date: '2026-05-31', actual_date: '2026-05-31', source: 'MANUAL', note: 'Container picked up by trucker' },
      { id: 'm4', milestone_code: 'BL_ISSUED', planned_date: '2026-06-02', actual_date: '2026-06-02', source: 'API', note: 'Draft B/L issued' },
      { id: 'm5', milestone_code: 'GATE_IN_POL', planned_date: '2026-06-01', actual_date: '2026-06-01', source: 'API', note: 'Container gated in at Shanghai' },
      { id: 'm6', milestone_code: 'ATD', planned_date: '2026-06-02', actual_date: null, source: 'API', note: null },
      { id: 'm7', milestone_code: 'CUSTOM_DRAFT_SUBMITTED', planned_date: '2026-06-10', actual_date: null, source: 'API', note: null },
      { id: 'm8', milestone_code: 'AN_ATA', planned_date: '2026-06-14', actual_date: null, source: 'API', note: null },
      { id: 'm9', milestone_code: 'CUSTOM_CLEARED', planned_date: '2026-06-16', actual_date: null, source: 'API', note: null },
      { id: 'm10', milestone_code: 'EDO_DELIVERY', planned_date: '2026-06-18', actual_date: null, source: 'API', note: null },
    ],
    documents: [
      { id: 'doc-1', document_type: 'Hóa đơn thương mại (Commercial Invoice)', file_name: 'COMMERCIAL_INVOICE_PO0005.pdf', status: 'APPROVED', uploaded_at: '2026-06-02' },
      { id: 'doc-2', document_type: 'Phiếu đóng gói (Packing List)', file_name: 'PACKING_LIST_PO0005.pdf', status: 'APPROVED', uploaded_at: '2026-06-02' },
      { id: 'doc-3', document_type: 'Vận đơn nháp (Draft B/L)', file_name: 'DRAFT_BL_SHP0001.pdf', status: 'WAITING_REVIEW', review_due_at: new Date(Date.now() + 1.5 * 60 * 60 * 1000).toISOString(), uploaded_at: new Date(Date.now() - 0.5 * 60 * 60 * 1000).toISOString() },
      { id: 'doc-4', document_type: 'Vận đơn chính thức (Official B/L)', file_name: null, status: 'PENDING_UPLOAD' },
      { id: 'doc-5', document_type: 'Tờ khai hải quan (Customs Declaration)', file_name: null, status: 'PENDING_UPLOAD' },
    ],
    po_tasks: [
      { id: 't-1', task_name: 'Duyệt báo giá vận chuyển', status: 'COMPLETED', assignee_role: 'LOGISTICS' },
      { id: 't-2', task_name: 'Xác nhận booking space', status: 'COMPLETED', assignee_role: 'LOGISTICS' },
      { id: 't-3', task_name: 'Đặt cọc nhà cung cấp', status: 'COMPLETED', assignee_role: 'FINANCE' },
      { id: 't-4', task_name: 'Khai báo thông tin hải quan sơ bộ', status: 'IN_PROGRESS', assignee_role: 'CUSTOMS_BROKER' },
    ],
  },
  {
    id: 'shp-1002',
    shipment_number: 'SHP-2026-0002',
    do_number: 'DO-2026-000003',
    po_number: 'PO-2026-000002',
    status: 'BOOKED',
    shipping_mode: 'AIR',
    carrier_name: 'Singapore Airlines',
    vessel_voyage: 'SQ772',
    origin_port: 'Changi (SIN)',
    dest_port: 'Tan Son Nhat (SGN)',
    etd: '2026-06-10',
    eta: '2026-06-11',
    customs: {
      stream: 'GREEN',
      lane_status: 'Thông quan tự động',
    },
    milestones: [
      { id: 'm2-1', milestone_code: 'BOOKING_CONFIRMED', planned_date: '2026-06-05', actual_date: '2026-06-05', source: 'API', note: 'Airway bill booked' },
      { id: 'm2-2', milestone_code: 'CARGO_READY', planned_date: '2026-06-08', actual_date: null, source: 'API', note: null },
      { id: 'm2-3', milestone_code: 'PICK_UP', planned_date: '2026-06-09', actual_date: null, source: 'API', note: null },
      { id: 'm2-4', milestone_code: 'BL_ISSUED', planned_date: '2026-06-10', actual_date: null, source: 'API', note: null },
      { id: 'm2-5', milestone_code: 'GATE_IN_POL', planned_date: '2026-06-10', actual_date: null, source: 'API', note: null },
      { id: 'm2-6', milestone_code: 'ATD', planned_date: '2026-06-10', actual_date: null, source: 'API', note: null },
      { id: 'm2-7', milestone_code: 'CUSTOM_DRAFT_SUBMITTED', planned_date: '2026-06-10', actual_date: null, source: 'API', note: null },
      { id: 'm2-8', milestone_code: 'AN_ATA', planned_date: '2026-06-11', actual_date: null, source: 'API', note: null },
      { id: 'm2-9', milestone_code: 'CUSTOM_CLEARED', planned_date: '2026-06-11', actual_date: null, source: 'API', note: null },
      { id: 'm2-10', milestone_code: 'EDO_DELIVERY', planned_date: '2026-06-12', actual_date: null, source: 'API', note: null },
    ],
    documents: [
      { id: 'doc-2-1', document_type: 'Hóa đơn thương mại (Commercial Invoice)', file_name: null, status: 'PENDING_UPLOAD' },
      { id: 'doc-2-2', document_type: 'Phiếu đóng gói (Packing List)', file_name: null, status: 'PENDING_UPLOAD' },
      { id: 'doc-2-3', document_type: 'Vận đơn nháp (Draft B/L)', file_name: null, status: 'PENDING_UPLOAD' },
      { id: 'doc-2-4', document_type: 'Vận đơn chính thức (Official B/L)', file_name: null, status: 'PENDING_UPLOAD' },
      { id: 'doc-2-5', document_type: 'Tờ khai hải quan (Customs Declaration)', file_name: null, status: 'PENDING_UPLOAD' },
    ],
    po_tasks: [
      { id: 't2-1', task_name: 'Duyệt báo giá vận chuyển', status: 'COMPLETED', assignee_role: 'LOGISTICS' },
      { id: 't2-2', task_name: 'Xác nhận booking space', status: 'IN_PROGRESS', assignee_role: 'LOGISTICS' },
      { id: 't2-3', task_name: 'Đặt cọc nhà cung cấp', status: 'TODO', assignee_role: 'FINANCE' },
    ],
  },
];
