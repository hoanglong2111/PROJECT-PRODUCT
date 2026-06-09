import type {
  PurchaseOrder,
  PurchaseOrderLot,
  DeliveryOrder,
  DeliverySourceLine,
  LogisticsTask,
  DashboardStats,
  SlaAlert,
  ShipmentRecord,
} from './logistics';

export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-1',
    po_number: 'PO-2026-000001',
    source_pr_codes: [],
    supplier_code: 'SUP-HANSOL',
    supplier_name: 'Hansol Materials Korea',
    status: 'CONFIRMED',
    order_date: '2026-05-15',
    currency: 'USD',
    total_amount: 183500,
    sap_sync_status: 'SYNCED',
    linked_do_numbers: ['DO-2026-000001', 'DO-2026-000002'],
    lots: [
      {
        id: 'lot-po1-1',
        lot_no: 'Lot 1',
        do_number: 'DO-2026-000001',
        allocations: [
          { id: 'alloc-1', po_line_id: 'po-item-1', quantity: 5000 },
          { id: 'alloc-2', po_line_id: 'po-item-2', quantity: 2400 },
        ],
      },
      {
        id: 'lot-po1-2',
        lot_no: 'Lot 2',
        do_number: 'DO-2026-000002',
        allocations: [
          { id: 'alloc-3', po_line_id: 'po-item-3', quantity: 1200 },
          { id: 'alloc-4', po_line_id: 'po-item-4', quantity: 800 },
        ],
      },
    ],
    po_type: 'SEA',
    incoterm: 'CIP',
    payment_term: 'Net 30',
    expected_etd: '2026-05-22',
    expected_eta: '2026-06-02',
    version: 2,
    sent_at: '2026-05-16T03:00:00Z',
    confirmed_date: '2026-05-17',
    warehouse_code: 'WH001',
    flow_tags: ['SPLIT_PURCHASE'],
    line_items: [
      {
        id: 'po-item-1',
        source_pr_code: '',
        source_pr_line_id: '',
        item_code: 'ITM-001',
        item_name: 'Silicon Wafer Core 8-inch',
        quantity: 5000,
        unit: 'PCS',
        warehouse_deadline_date: '2026-06-08',
        warehouse_code: 'WH001',
        unit_price: 15.5,
        lot_number: 'Lot 1',
      } as any,
      {
        id: 'po-item-2',
        source_pr_code: '',
        source_pr_line_id: '',
        item_code: 'ITM-002',
        item_name: 'Lithium Battery Pack Cell',
        quantity: 2400,
        unit: 'PCS',
        warehouse_deadline_date: '2026-06-08',
        warehouse_code: 'WH001',
        unit_price: 28,
        lot_number: 'Lot 1',
      } as any,
      {
        id: 'po-item-3',
        source_pr_code: '',
        source_pr_line_id: '',
        item_code: 'ITM-003',
        item_name: 'Industrial Control PCB',
        quantity: 1200,
        unit: 'PCS',
        warehouse_deadline_date: '2026-06-16',
        warehouse_code: 'WH002',
        unit_price: 34,
        lot_number: 'Lot 2',
      } as any,
      {
        id: 'po-item-4',
        source_pr_code: '',
        source_pr_line_id: '',
        item_code: 'ITM-004',
        item_name: 'Copper Shielding Roll',
        quantity: 800,
        unit: 'ROLL',
        warehouse_deadline_date: '2026-06-16',
        warehouse_code: 'WH002',
        unit_price: 96,
        lot_number: 'Lot 2',
      } as any,
    ],
  },
  {
    id: 'po-2',
    po_number: 'PO-2026-000002',
    source_pr_codes: [],
    supplier_code: 'SUP-ORIENTAL',
    supplier_name: 'Oriental Components Pte Ltd',
    status: 'SENT',
    order_date: '2026-05-20',
    currency: 'USD',
    total_amount: 98400,
    sap_sync_status: 'SYNCED',
    linked_do_numbers: ['DO-2026-000003'],
    lots: [
      {
        id: 'lot-po2-1',
        lot_no: 'Lot 1',
        do_number: 'DO-2026-000003',
        allocations: [{ id: 'alloc-5', po_line_id: 'po-item-5', quantity: 12000 }],
      },
    ],
    po_type: 'AIR',
    incoterm: 'FCA',
    payment_term: 'Net 45',
    expected_etd: '2026-06-10',
    expected_eta: '2026-06-11',
    version: 1,
    sent_at: '2026-05-21T04:00:00Z',
    confirmed_date: null,
    warehouse_code: 'WH002',
    flow_tags: ['LINEAR'],
    line_items: [
      {
        id: 'po-item-5',
        source_pr_code: '',
        source_pr_line_id: '',
        item_code: 'ITM-005',
        item_name: 'Sensor Assembly Module',
        quantity: 12000,
        unit: 'PCS',
        warehouse_deadline_date: '2026-06-15',
        warehouse_code: 'WH002',
        unit_price: 8.2,
        lot_number: 'Lot 1',
      } as any,
    ],
  },
];

function makeSourceLines(poNumber: string, lotNo: string): DeliverySourceLine[] {
  const po = mockPurchaseOrders.find((order) => order.po_number === poNumber);
  const lot = po?.lots?.find((item) => item.lot_no === lotNo);
  if (!po || !lot) return [];

  return lot.allocations
    .map((allocation) => {
      const line = po.line_items.find((item) => item.id === allocation.po_line_id);
      if (!line) return null;
      return {
        id: allocation.id,
        po_number: po.po_number,
        po_line_id: line.id,
        request_code: '',
        pr_line_id: line.source_pr_line_id,
        item_code: line.item_code,
        item_name: line.item_name,
        quantity: allocation.quantity,
        unit: line.unit,
      } satisfies DeliverySourceLine;
    })
    .filter((line): line is DeliverySourceLine => Boolean(line));
}

function makeDeliveryOrder({
  id,
  doNo,
  poNo,
  lotId,
  lotNo,
  status,
  shipmentNo,
  eta,
}: {
  id: string;
  doNo: string;
  poNo: string;
  lotId: string;
  lotNo: string;
  status: DeliveryOrder['order_info']['status'];
  shipmentNo?: string | null;
  eta: string;
}): DeliveryOrder {
  const po = mockPurchaseOrders.find((order) => order.po_number === poNo)!;
  const sourceLines = makeSourceLines(poNo, lotNo);
  const totalQty = sourceLines.reduce((sum, line) => sum + line.quantity, 0);
  const firstLine = sourceLines[0];
  const firstPoLine = po.line_items.find((line) => line.id === firstLine?.po_line_id);

  return {
    id,
    source_po_number: po.po_number,
    source_lot_id: lotId,
    source_lot_no: lotNo,
    linked_shipment_number: shipmentNo ?? null,
    order_info: {
      request_code: `${po.po_number}-${lotNo.replace(/\s+/g, '').toUpperCase()}`,
      order_number: doNo,
      tracking_number: shipmentNo ?? null,
      purchase_contract_number: `CON-${po.po_number.slice(-6)}-${lotNo.slice(-1)}`,
      status,
      notes: `Auto-created from ${po.po_number} / ${lotNo}`,
      xnk_notes: '',
    },
    product_details: {
      item_name_requested: sourceLines.map((line) => line.item_name).join(', '),
      unit: firstLine?.unit ?? 'PCS',
      quantity: totalQty,
      lot_number: lotNo,
      lot_unit_quantity: sourceLines.length,
      lot_unit_type: 'PO line allocation',
      packaging_type: null,
    },
    source_lines: sourceLines,
    sap_integration: {
      supplier_code: po.supplier_code,
      supplier_name: po.supplier_name,
      actual_item_code: firstLine?.item_code ?? null,
      raw_date: null,
      po_number: po.po_number,
      sync_status: 'SYNCED',
    },
    logistics_shipping: {
      incoterms: po.incoterm ?? 'CIP',
      shipping_method: po.po_type === 'AIR' ? 'AIR' : po.po_type === 'DOMESTIC' ? 'ROAD' : 'SEA',
      shipping_line: shipmentNo ? 'Maersk Line' : null,
      vessel_code: shipmentNo ? 'MAERSK EVOLUTION V102' : null,
      port_of_departure: po.po_type === 'AIR' ? 'Changi (SIN)' : 'Busan (KRPUS)',
      port_of_destination: po.po_type === 'AIR' ? 'Tan Son Nhat (SGN)' : 'Cat Lai (VNCLI)',
      documents_list: ['Commercial Invoice', 'Packing List', po.po_type === 'AIR' ? 'AWB' : 'B/L'],
      missing_documents: shipmentNo ? [] : ['Booking confirmation'],
      cut_off_date: null,
      etd_planned: po.expected_etd ?? null,
      eta_planned: eta,
    },
    warehouse_tracking: {
      warehouse_code: po.warehouse_code,
      production_ready_date: null,
      warehouse_deadline: firstPoLine?.warehouse_deadline_date ?? eta,
      planned_entry_date: eta,
      actual_entry_date: null,
      delay_days: 0,
    },
    finance_tax: {
      import_tax_rate: 5,
      tax_amount: Math.round(po.total_amount * 0.05),
      currency: po.currency,
      tax_payment_deadline: null,
      insurance: null,
    },
    task_summary: {
      total_tasks: 3,
      completed_tasks: shipmentNo ? 2 : 1,
      blocked_tasks: 0,
      required_tasks_remaining: shipmentNo ? 1 : 2,
    },
    flow_tags: po.flow_tags,
  };
}

export const mockDeliveryOrders: DeliveryOrder[] = [
  makeDeliveryOrder({
    id: 'do-1',
    doNo: 'DO-2026-000001',
    poNo: 'PO-2026-000001',
    lotId: 'lot-po1-1',
    lotNo: 'Lot 1',
    status: 'IN_TRANSIT',
    shipmentNo: 'SHP-2026-0001',
    eta: '2026-06-02',
  }),
  makeDeliveryOrder({
    id: 'do-2',
    doNo: 'DO-2026-000002',
    poNo: 'PO-2026-000001',
    lotId: 'lot-po1-2',
    lotNo: 'Lot 2',
    status: 'CONFIRMED',
    shipmentNo: null,
    eta: '2026-06-16',
  }),
  makeDeliveryOrder({
    id: 'do-3',
    doNo: 'DO-2026-000003',
    poNo: 'PO-2026-000002',
    lotId: 'lot-po2-1',
    lotNo: 'Lot 1',
    status: 'DRAFT',
    shipmentNo: null,
    eta: '2026-06-11',
  }),
];


export type UpdatePurchaseOrderLotAllocationPayload = {
  lots: Array<{
    id?: string;
    lotNo: string;
    doNumber?: string;
  }>;
  lineAllocations: Array<{
    poLineId: string;
    lotNo: string;
    quantity: number;
  }>;
};

function getMaxDoSequence() {
  return mockDeliveryOrders.reduce((current, order) => {
    const number = Number(order.order_info.order_number.match(/(\d+)$/)?.[1] ?? 0);
    return Math.max(current, number);
  }, 0);
}

function formatDoNumber(sequence: number) {
  return `DO-2026-${String(sequence).padStart(6, '0')}`;
}

export function updateMockPurchaseOrderLotAllocation(
  poNumber: string,
  payload: UpdatePurchaseOrderLotAllocationPayload,
) {
  const po = mockPurchaseOrders.find((order) => order.po_number === poNumber);
  if (!po) return null;

  const existingLots = po.lots ?? [];
  const normalizedLots = payload.lots.length > 0 ? payload.lots : [{ lotNo: 'Lot 1' }];
  let nextDoSequence = getMaxDoSequence() + 1;
  const nextLots: PurchaseOrderLot[] = normalizedLots.map((lot, index) => {
    const existing = existingLots.find((item) => item.lot_no === lot.lotNo || item.do_number === lot.doNumber);
    const allocations = payload.lineAllocations
      .filter((allocation) => allocation.lotNo === lot.lotNo)
      .map((allocation, allocationIndex) => ({
        id: `${lot.id ?? existing?.id ?? `lot-${po.id}-${index + 1}`}-alloc-${allocationIndex + 1}`,
        po_line_id: allocation.poLineId,
        quantity: allocation.quantity,
      }));

    return {
      id: lot.id ?? existing?.id ?? `lot-${po.id}-${index + 1}`,
      lot_no: lot.lotNo,
      do_number: lot.doNumber ?? existing?.do_number ?? formatDoNumber(nextDoSequence++),
      allocations,
    };
  });

  po.lots = nextLots;
  po.linked_do_numbers = nextLots.map((lot) => lot.do_number).filter((value): value is string => Boolean(value));
  po.flow_tags = nextLots.length > 1 ? ['SPLIT_PURCHASE'] : ['LINEAR'];
  po.line_items = po.line_items.map((line) => {
    const allocation = payload.lineAllocations.find((item) => item.poLineId === line.id);
    return allocation ? { ...line, lot_number: allocation.lotNo } : line;
  });

  const preservedLinkedOrders = mockDeliveryOrders.filter(
    (order) =>
      order.source_po_number === po.po_number &&
      order.linked_shipment_number &&
      !nextLots.some((lot) => lot.do_number === order.order_info.order_number),
  );
  const unrelatedOrders = mockDeliveryOrders.filter((order) => order.source_po_number !== po.po_number);
  const regeneratedOrders = nextLots.map((lot, index) => {
    const existingOrder = mockDeliveryOrders.find(
      (order) => order.order_info.order_number === lot.do_number || order.source_lot_no === lot.lot_no,
    );
    return makeDeliveryOrder({
      id: existingOrder?.id ?? `do-generated-${po.id}-${index + 1}`,
      doNo: lot.do_number ?? formatDoNumber(nextDoSequence++),
      poNo: po.po_number,
      lotId: lot.id,
      lotNo: lot.lot_no,
      status: existingOrder?.order_info.status ?? 'DRAFT',
      shipmentNo: existingOrder?.linked_shipment_number ?? null,
      eta: existingOrder?.logistics_shipping.eta_planned ?? po.expected_eta ?? po.order_date,
    });
  });

  mockDeliveryOrders.splice(0, mockDeliveryOrders.length, ...unrelatedOrders, ...regeneratedOrders, ...preservedLinkedOrders);

  mockDashboardStats.totals.purchaseOrders = mockPurchaseOrders.length;
  mockDashboardStats.totals.deliveryOrders = mockDeliveryOrders.length;
  mockDashboardStats.deliveryOrderStatus = Array.from(
    mockDeliveryOrders.reduce((counts, order) => {
      counts.set(order.order_info.status, (counts.get(order.order_info.status) ?? 0) + 1);
      return counts;
    }, new Map<DeliveryOrder['order_info']['status'], number>()),
  ).map(([status, count]) => ({ status, count }));

  return po;
}

export const mockTasks: LogisticsTask[] = [
  {
    task_id: 'task-1',
    do_number: 'DO-2026-000001',
    hbl_number: null,
    request_code: 'REQ-001',
    po_number: 'PO-2026-000001',
    production_contract_number: 'HD-SX-2026-000001',
    task_name: 'Check customs document set',
    role: 'Customs Officer',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    progress: 50,
    due_date: '2026-05-24',
    is_required_for_do_closure: true,
    notes: 'Verify invoice and packing list values match exactly.',
    blocked_reason: null,
    completed_at: null,
    created_at: '2026-05-16',
    assigned_at: '2026-05-16',
    assignee: {
      user_id: 'usr-customs-001',
      name: 'Le Minh Chau',
      department: 'Import Customs',
    },
  },
  {
    task_id: 'task-2',
    do_number: 'DO-2026-000001',
    hbl_number: null,
    request_code: 'REQ-002',
    po_number: 'PO-2026-000001',
    production_contract_number: 'HD-SX-2026-000001',
    task_name: 'Update carrier tracking and ETA',
    role: 'Port Officer',
    status: 'TODO',
    priority: 'MEDIUM',
    progress: 0,
    due_date: '2026-05-22',
    is_required_for_do_closure: false,
    notes: 'Confirm flight KE345 has departed.',
    blocked_reason: null,
    completed_at: null,
    created_at: '2026-05-16',
    assigned_at: '2026-05-16',
    assignee: {
      user_id: 'usr-port-001',
      name: 'Pham Quoc Huy',
      department: 'Port Operations',
    },
  },
];

export const mockDashboardStats: DashboardStats = {
  totals: {
    purchaseRequests: 0,
    purchaseOrders: mockPurchaseOrders.length,
    deliveryOrders: mockDeliveryOrders.length,
    tasks: mockTasks.length,
    blockedTasks: 0,
  },
  businessFlowCounts: [
    { tag: 'LINEAR', count: 2 },
    { tag: 'BULK_PURCHASE', count: 1 },
  ],
  deliveryOrderStatus: [
    { status: 'IN_TRANSIT', count: 1 },
    { status: 'CONFIRMED', count: 1 },
    { status: 'DRAFT', count: 1 },
  ],
  taskStatus: [
    { status: 'IN_PROGRESS', count: 1 },
    { status: 'TODO', count: 1 },
  ],
  taskRoleProgress: [
    { role: 'Customs Officer', total: 1, completed: 0, completionRate: 0 },
    { role: 'Port Officer', total: 1, completed: 0, completionRate: 0 },
  ],
  monthlyThroughput: [
    { month: '2026-05', deliveryOrders: 1, completedTasks: 0 },
  ],
};

export const mockSlaAlerts: SlaAlert[] = [
  {
    entityId: 'do-1',
    entityType: 'document_review',
    message: 'Customs document set check is due soon (SLA Warning)',
    ownerRole: 'Customs Officer',
    slaDueAt: '2026-05-24T12:00:00Z',
    slaStage: 'Customs Clearance',
  },
];

export const mockDomesticTransportOrders = [
  {
    id: 'dto-1',
    requestCode: 'REQ-DTO-001',
    doNumber: 'DO-2026-000001',
    carrierCode: 'CAR-HUU-NGHI',
    carrierName: 'Logistics Hữu Nghị',
    status: 'PENDING',
    pickupAddress: 'Noi Bai (HAN) Cargo Terminal',
    deliveryAddress: 'Industrial Zone A, Hanoi',
    plannedPickupAt: '2026-05-24T08:00:00Z',
    plannedDeliveryAt: '2026-05-24T14:00:00Z',
    weightKg: 1500,
    volumeCbm: 4.5,
    quotes: [
      {
        id: 'quote-1',
        carrierCode: 'CAR-HUU-NGHI',
        carrierName: 'Logistics Hữu Nghị',
        amount: 350,
        currency: 'USD',
        isMinPrice: true,
        isSlaPassed: true,
      },
    ],
  },
];

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

export const mockIssues = [
  {
    id: 'issue-1',
    entityId: 'do-1',
    entityType: 'DELIVERY_ORDER',
    title: 'Customs Declaration Delay',
    description: 'Customs rejected the initial declaration due to HS code format mismatch.',
    reportedBy: 'Le Minh Chau',
    severity: 'HIGH',
    status: 'OPEN',
    createdAt: '2026-05-23T09:30:00Z',
    resolvedAt: null,
  },
];
