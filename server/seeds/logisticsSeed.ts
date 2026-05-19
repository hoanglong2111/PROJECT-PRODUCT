import type { DeliveryOrder, LogisticsTask, PurchaseOrder, PurchaseRequest, TaskRole, UserRef } from '../../src/models/logistics';

type ItemSeed = {
  code: string;
  name: string;
  unit: string;
  unitCost: number;
};

type SupplierSeed = {
  code: string;
  countryPort: string;
  currency: string;
  incoterms: string;
  name: string;
  port: string;
};

const baseDate = '2026-05-18';
const requiredDocuments = ['Invoice', 'Packing List', 'B/L'];

export const seedUsers: Record<string, UserRef> = {
  requester: { user_id: 'USR-PROD-012', name: 'Nguyen Van An', department: 'Production Planning' },
  buyer: { user_id: 'USR-PUR-004', name: 'Tran Thi Binh', department: 'Purchasing' },
  customs: { user_id: 'USR-CUS-003', name: 'Le Minh Chau', department: 'Import Customs' },
  port: { user_id: 'USR-PORT-002', name: 'Pham Quoc Huy', department: 'Port Operations' },
  finance: { user_id: 'USR-FIN-008', name: 'Do Thi Ngoc', department: 'Finance' },
  warehouse: { user_id: 'USR-WH-011', name: 'Hoang Minh Quan', department: 'Warehouse' },
  sale: { user_id: 'USR-SALE-006', name: 'Vu Thu Ha', department: 'Sales Operations' },
};

const items: ItemSeed[] = [
  { code: 'RM-ALU-6061-T6', name: 'Aluminum alloy 6061-T6 bar', unit: 'kg', unitCost: 36 },
  { code: 'RM-STEEL-SUS304', name: 'Stainless steel SUS304 coil', unit: 'kg', unitCost: 28 },
  { code: 'PKG-CARTON-9L', name: 'Moisture resistant carton 9 layers', unit: 'pcs', unitCost: 1.4 },
  { code: 'RM-COPPER-C1100', name: 'Copper C1100 sheet', unit: 'kg', unitCost: 31 },
  { code: 'SP-PT100-IND', name: 'Industrial PT100 temperature sensor', unit: 'pcs', unitCost: 160 },
  { code: 'RM-RUBBER-NBR', name: 'NBR rubber sealing roll', unit: 'm', unitCost: 5.8 },
  { code: 'CHEM-IPA-99', name: 'IPA cleaning solvent 99 percent', unit: 'ltr', unitCost: 4.2 },
  { code: 'MRO-BEARING-6205', name: 'Bearing 6205 ZZ maintenance stock', unit: 'pcs', unitCost: 8.6 },
];

const suppliers: SupplierSeed[] = [
  {
    code: 'SUP-CN-0007',
    countryPort: 'CNSZX - Shenzhen',
    currency: 'USD',
    incoterms: 'FOB Shenzhen',
    name: 'Shenzhen Metal Materials Co., Ltd.',
    port: 'VNSGN - Cat Lai',
  },
  {
    code: 'SUP-CN-0011',
    countryPort: 'CNSHA - Shanghai',
    currency: 'USD',
    incoterms: 'CIF Ho Chi Minh',
    name: 'Shanghai Copper Supply Ltd.',
    port: 'VNSGN - Cat Lai',
  },
  {
    code: 'SUP-DE-0003',
    countryPort: 'DEMUC - Munich',
    currency: 'EUR',
    incoterms: 'DAP Ho Chi Minh',
    name: 'Munich Industrial Sensor GmbH',
    port: 'VNSGN - Tan Son Nhat',
  },
  {
    code: 'SUP-JP-0009',
    countryPort: 'JPTYO - Tokyo',
    currency: 'JPY',
    incoterms: 'CIF Ho Chi Minh',
    name: 'Tokyo Precision Parts KK',
    port: 'VNSGN - Cat Lai',
  },
  {
    code: 'SUP-KR-0004',
    countryPort: 'KRPUS - Busan',
    currency: 'USD',
    incoterms: 'FOB Busan',
    name: 'Busan Industrial Supply Co.',
    port: 'VNSGN - Cat Lai',
  },
];

const shippingMethods: Array<DeliveryOrder['logistics_shipping']['shipping_method']> = ['SEA', 'AIR', 'ROAD'];
const deliveryStatuses: Array<DeliveryOrder['order_info']['status']> = [
  'CREATED',
  'CONFIRMED',
  'IN_PRODUCTION',
  'IN_TRANSIT',
  'ARRIVED_PORT',
  'CUSTOMS_PROCESSING',
  'WAREHOUSE_PENDING',
  'DELIVERED',
  'DELAYED',
];
const delayOffsets = [-3, -1, 0, 2, 4, 7];

const purchaseRequests: PurchaseRequest[] = [];
const purchaseOrders: PurchaseOrder[] = [];
const deliveryOrders: DeliveryOrder[] = [];
const logisticsTasks: LogisticsTask[] = [];

for (let index = 0; index < 22; index += 1) {
  const item = items[index % items.length];
  const supplier = suppliers[index % suppliers.length];
  const quantity = 180 + index * 75;
  const requestedDate = addDays(baseDate, -8 + index);
  const deadline = addDays(baseDate, 12 + index * 2);
  const expectedArrival = addDays(deadline, delayOffsets[index % delayOffsets.length]);
  const hasPo = ![2, 7, 13, 19].includes(index);
  const hasDo = hasPo && ![5, 16].includes(index);
  const prCode = `PR-2026-${String(145 + index).padStart(6, '0')}`;
  const poNumber = hasPo ? `PO-${4500098123 + index}` : null;
  const doNumber = hasDo ? `DO-2026-${String(87 + index).padStart(6, '0')}` : null;
  const prLineId = `pr-line-seed-${String(index + 1).padStart(3, '0')}-001`;
  const poLineId = `po-line-seed-${String(index + 1).padStart(3, '0')}-001`;
  const warehouseCode = `WH-HCM-0${(index % 3) + 1}`;
  const status = hasPo ? 'CONVERTED_TO_PO' : index % 3 === 0 ? 'PENDING_APPROVAL' : 'APPROVED';
  const delivered = hasDo && index % 7 === 0;
  const actualEntry = delivered ? addDays(expectedArrival, index % 2 === 0 ? 1 : -1) : null;
  const delayDays = calculateDelayDays(actualEntry ?? expectedArrival, deadline);

  purchaseRequests.push({
    id: `pr-seed-${String(index + 1).padStart(3, '0')}`,
    requested_order_id: prCode,
    item_code: item.code,
    item_name: item.name,
    quantity,
    unit: item.unit,
    priority: index % 6 === 0 ? 'URGENT' : index % 4 === 0 ? 'HIGH' : index % 3 === 0 ? 'LOW' : 'MEDIUM',
    requested_order_date: requestedDate,
    adjusted_date: index % 5 === 0 ? addDays(requestedDate, 2) : null,
    warehouse_deadline_date: deadline,
    production_contract_number: `PC-2026-HCM-${String(42 + index).padStart(3, '0')}`,
    requester: index % 4 === 0 ? seedUsers.sale : seedUsers.requester,
    purchasing_manager: seedUsers.buyer,
    status,
    notes: `Seeded logistics demand ${index + 1} for PostgreSQL import.`,
    line_items: [
      {
        id: prLineId,
        item_code: item.code,
        item_name: item.name,
        quantity,
        unit: item.unit,
        warehouse_deadline_date: deadline,
        warehouse_code: warehouseCode,
        production_contract_number: `PC-2026-HCM-${String(42 + index).padStart(3, '0')}`,
        linked_po_numbers: poNumber ? [poNumber] : [],
        linked_do_numbers: doNumber ? [doNumber] : [],
      },
    ],
    actual_warehouse_entry_date: actualEntry,
    supplier_expected_delivery_date: hasPo ? addDays(expectedArrival, -5) : null,
    expected_arrival_date: hasPo ? expectedArrival : null,
    delay_days: delayDays,
    linked_po_numbers: poNumber ? [poNumber] : [],
    linked_do_numbers: doNumber ? [doNumber] : [],
    warehouse_code: warehouseCode,
    flow_tags: ['LINEAR'],
  });

  if (!poNumber) {
    continue;
  }

  const sapPending = index % 6 === 0;
  purchaseOrders.push({
    id: `po-seed-${String(index + 1).padStart(3, '0')}`,
    po_number: poNumber,
    source_pr_codes: [prCode],
    line_items: [
      {
        id: poLineId,
        source_pr_code: prCode,
        source_pr_line_id: prLineId,
        item_code: item.code,
        item_name: item.name,
        quantity,
        unit: item.unit,
        warehouse_deadline_date: deadline,
        warehouse_code: warehouseCode,
      },
    ],
    supplier_code: supplier.code,
    supplier_name: supplier.name,
    status: delivered ? 'CLOSED' : hasDo ? 'PARTIALLY_DELIVERED' : 'SAP_PENDING',
    order_date: addDays(requestedDate, 3),
    currency: supplier.currency,
    total_amount: Math.round(quantity * item.unitCost),
    sap_sync_status: sapPending ? 'PENDING' : 'SYNCED',
    linked_do_numbers: doNumber ? [doNumber] : [],
    warehouse_code: warehouseCode,
    flow_tags: ['LINEAR'],
  });

  if (!doNumber) {
    continue;
  }

  const statusIndex = delivered ? 7 : index % deliveryStatuses.length;
  const deliveryStatus = deliveryStatuses[statusIndex];
  const shippingMethod = shippingMethods[index % shippingMethods.length];
  const documents = buildDocuments(index);
  const missingDocuments = requiredDocuments.filter((documentName) => !documents.includes(documentName));
  const blockedByDocuments = missingDocuments.length > 0;
  const tasks = buildTasks({
    blockedByDocuments,
    deadline,
    doNumber,
    index,
    poNumber,
    prCode,
    productionContract: `PC-2026-HCM-${String(42 + index).padStart(3, '0')}`,
  });

  logisticsTasks.push(...tasks);

  deliveryOrders.push({
    id: `do-seed-${String(index + 1).padStart(3, '0')}`,
    order_info: {
      request_code: prCode,
      order_number: doNumber,
      tracking_number: deliveryStatus === 'CREATED' ? null : `TRK-${supplier.code.slice(-4)}-${String(260500 + index)}`,
      purchase_contract_number: `PC-2026-HCM-${String(42 + index).padStart(3, '0')}`,
      status: deliveryStatus,
      notes: `Seeded delivery order ${index + 1} for operational control tower.`,
      xnk_notes: blockedByDocuments ? `Missing ${missingDocuments.join(', ')} for customs readiness.` : 'Document set is ready for customs.',
    },
    product_details: {
      item_name_requested: item.name,
      unit: item.unit,
      quantity,
      lot_number: `LOT-${supplier.code.slice(4, 6)}-2605-${String(index + 1).padStart(2, '0')}`,
      lot_unit_quantity: Math.max(1, Math.round(quantity / 30)),
      lot_unit_type: shippingMethod === 'AIR' ? 'box' : 'pallet',
      packaging_type: shippingMethod === 'AIR' ? 'Carton box' : 'Wooden pallet',
    },
    source_lines: [
      {
        id: `do-source-seed-${String(index + 1).padStart(3, '0')}-001`,
        po_number: poNumber,
        po_line_id: poLineId,
        request_code: prCode,
        pr_line_id: prLineId,
        item_code: item.code,
        item_name: item.name,
        quantity,
        unit: item.unit,
      },
    ],
    sap_integration: {
      supplier_code: sapPending ? null : supplier.code,
      supplier_name: supplier.name,
      actual_item_code: item.code,
      raw_date: sapPending ? null : addDays(requestedDate, 4),
      po_number: poNumber,
      sync_status: sapPending ? 'SYNC_INCOMPLETE' : 'SYNCED',
    },
    logistics_shipping: {
      incoterms: supplier.incoterms,
      shipping_method: shippingMethod,
      shipping_line: shippingMethod === 'AIR' ? 'DHL Global Forwarding' : shippingMethod === 'ROAD' ? 'Mekong Freight' : 'COSCO Shipping',
      vessel_code: shippingMethod === 'ROAD' ? null : `VESSEL-${String(index + 1).padStart(3, '0')}`,
      port_of_departure: supplier.countryPort,
      port_of_destination: supplier.port,
      documents_list: documents,
      missing_documents: missingDocuments,
      cut_off_date: addDays(expectedArrival, -24),
      etd_planned: addDays(expectedArrival, -18),
      eta_planned: expectedArrival,
    },
    warehouse_tracking: {
      warehouse_code: warehouseCode,
      production_ready_date: addDays(requestedDate, 7),
      warehouse_deadline: deadline,
      planned_entry_date: addDays(expectedArrival, 2),
      actual_entry_date: actualEntry,
      delay_days: calculateDelayDays(actualEntry ?? addDays(expectedArrival, 2), deadline),
    },
    finance_tax: {
      import_tax_rate: index % 5 === 0 ? 0 : 5,
      tax_amount: index % 5 === 0 ? 0 : Math.round(quantity * item.unitCost * 600),
      currency: 'VND',
      tax_payment_deadline: addDays(expectedArrival, 1),
      insurance:
        index % 3 === 0
          ? {
              provider: 'Bao Viet Insurance',
              policy_number: `INS-2026-${String(index + 1).padStart(3, '0')}`,
              insured_amount: Math.round(quantity * item.unitCost * 25_000),
              currency: 'VND',
            }
          : null,
    },
    task_summary: summarizeTasks(tasks),
    flow_tags: ['LINEAR'],
  });
}

// Business flow fixtures: keep explicit graph shapes visible after import.
if (purchaseRequests[1] && purchaseOrders[0] && deliveryOrders[0]) {
  const request = purchaseRequests[1];
  const requestLine = request.line_items[0];
  purchaseOrders[0].source_pr_codes = Array.from(new Set([...purchaseOrders[0].source_pr_codes, request.requested_order_id]));
  purchaseOrders[0].line_items.push({
    id: 'po-line-flow-bulk-001',
    source_pr_code: request.requested_order_id,
    source_pr_line_id: requestLine.id,
    item_code: requestLine.item_code,
    item_name: requestLine.item_name,
    quantity: requestLine.quantity,
    unit: requestLine.unit,
    warehouse_deadline_date: requestLine.warehouse_deadline_date,
    warehouse_code: requestLine.warehouse_code,
  });
  purchaseOrders[0].flow_tags = ['BULK_PURCHASE'];
  request.linked_po_numbers = Array.from(new Set([...request.linked_po_numbers, purchaseOrders[0].po_number]));
  deliveryOrders[0].source_lines.push({
    id: 'do-source-flow-bulk-001',
    po_number: purchaseOrders[0].po_number,
    po_line_id: 'po-line-flow-bulk-001',
    request_code: request.requested_order_id,
    pr_line_id: requestLine.id,
    item_code: requestLine.item_code,
    item_name: requestLine.item_name,
    quantity: requestLine.quantity,
    unit: requestLine.unit,
  });
  deliveryOrders[0].flow_tags = ['BULK_PURCHASE'];
}

if (purchaseRequests[3] && purchaseOrders[3] && purchaseOrders[4]) {
  const request = purchaseRequests[3];
  const requestLine = request.line_items[0];
  purchaseOrders[4].source_pr_codes = [request.requested_order_id];
  purchaseOrders[4].line_items = [
    {
      ...purchaseOrders[4].line_items[0],
      source_pr_code: request.requested_order_id,
      source_pr_line_id: requestLine.id,
      quantity: Math.max(1, Math.round(requestLine.quantity / 2)),
    },
  ];
  purchaseOrders[3].flow_tags = ['SPLIT_PURCHASE'];
  purchaseOrders[4].flow_tags = ['SPLIT_PURCHASE'];
  request.linked_po_numbers = Array.from(new Set([...request.linked_po_numbers, purchaseOrders[3].po_number, purchaseOrders[4].po_number]));
  request.flow_tags = ['SPLIT_PURCHASE'];
}

if (purchaseOrders[6] && deliveryOrders[6]) {
  const original = deliveryOrders[6];
  const extraDoNumber = 'DO-2026-009901';
  purchaseOrders[6].linked_do_numbers = Array.from(new Set([...purchaseOrders[6].linked_do_numbers, extraDoNumber]));
  purchaseOrders[6].flow_tags = ['PARTIAL_DELIVERY'];
  deliveryOrders[6].flow_tags = ['PARTIAL_DELIVERY'];
  deliveryOrders.push({
    ...original,
    id: 'do-seed-flow-partial-001',
    order_info: {
      ...original.order_info,
      order_number: extraDoNumber,
      tracking_number: 'TRK-PARTIAL-9901',
      status: 'IN_TRANSIT',
    },
    product_details: {
      ...original.product_details,
      quantity: Math.max(1, Math.round(original.product_details.quantity / 2)),
    },
    source_lines: original.source_lines.map((line) => ({
      ...line,
      id: 'do-source-flow-partial-001',
      quantity: Math.max(1, Math.round(line.quantity / 2)),
    })),
    flow_tags: ['PARTIAL_DELIVERY'],
  });
}

if (purchaseOrders[8] && purchaseOrders[9] && deliveryOrders[8]) {
  const extraLine = purchaseOrders[9].line_items[0];
  deliveryOrders[8].source_lines.push({
    id: 'do-source-flow-container-001',
    po_number: purchaseOrders[9].po_number,
    po_line_id: extraLine.id,
    request_code: extraLine.source_pr_code,
    pr_line_id: extraLine.source_pr_line_id,
    item_code: extraLine.item_code,
    item_name: extraLine.item_name,
    quantity: extraLine.quantity,
    unit: extraLine.unit,
  });
  deliveryOrders[8].flow_tags = ['CONTAINER_CONSOLIDATION'];
  purchaseOrders[8].flow_tags = ['CONTAINER_CONSOLIDATION'];
  purchaseOrders[9].linked_do_numbers = Array.from(new Set([...purchaseOrders[9].linked_do_numbers, deliveryOrders[8].order_info.order_number]));
  purchaseOrders[9].flow_tags = ['CONTAINER_CONSOLIDATION'];
}

export { deliveryOrders, logisticsTasks, purchaseOrders, purchaseRequests };

export const logisticsSnapshotSeeds: Record<string, unknown> = {
  purchase_requests: purchaseRequests,
  purchase_orders: purchaseOrders,
  delivery_orders: deliveryOrders,
  tasks: logisticsTasks,
};

function buildDocuments(index: number) {
  if (index % 6 === 0) {
    return ['Invoice'];
  }

  if (index % 4 === 0) {
    return ['Invoice', 'Packing List'];
  }

  if (index % 5 === 0) {
    return ['Invoice', 'B/L'];
  }

  return ['Invoice', 'Packing List', 'B/L', 'CO'];
}

function buildTasks({
  blockedByDocuments,
  deadline,
  doNumber,
  index,
  poNumber,
  prCode,
  productionContract,
}: {
  blockedByDocuments: boolean;
  deadline: string;
  doNumber: string;
  index: number;
  poNumber: string;
  prCode: string;
  productionContract: string;
}): LogisticsTask[] {
  const baseTaskId = 600 + index * 10;
  const taskTemplates: Array<{
    assignee: UserRef;
    name: string;
    offset: number;
    role: TaskRole;
  }> = [
    { assignee: seedUsers.customs, name: 'Check customs document set', offset: -5, role: 'Customs Officer' },
    { assignee: seedUsers.port, name: 'Update ETA and carrier tracking', offset: -8, role: 'Port Officer' },
    { assignee: seedUsers.finance, name: 'Confirm import tax amount', offset: -3, role: 'Finance Officer' },
    { assignee: seedUsers.warehouse, name: 'Confirm warehouse entry slot', offset: -1, role: 'Warehouse Staff' },
  ];

  return taskTemplates.map((template, taskIndex) => {
    const completed = index % 7 === 0 || (taskIndex === 1 && index % 3 !== 0);
    const blocked = taskIndex === 0 && blockedByDocuments;
    const progress = completed ? 100 : blocked ? 20 : taskIndex === 2 ? 45 : 10;

    return {
      task_id: `TASK-2026-${String(baseTaskId + taskIndex).padStart(6, '0')}`,
      do_number: doNumber,
      request_code: prCode,
      po_number: poNumber,
      production_contract_number: productionContract,
      task_name: template.name,
      role: template.role,
      assignee: template.assignee,
      progress,
      created_at: `${addDays(baseDate, -4 + index)}T09:00:00+07:00`,
      assigned_at: `${addDays(baseDate, -4 + index)}T10:00:00+07:00`,
      completed_at: completed ? `${addDays(baseDate, -1 + index)}T15:30:00+07:00` : null,
      status: completed ? 'COMPLETED' : blocked ? 'BLOCKED' : taskIndex === 3 ? 'WAITING' : 'IN_PROGRESS',
      priority: blocked ? 'HIGH' : index % 6 === 0 ? 'URGENT' : 'MEDIUM',
      due_date: addDays(deadline, template.offset),
      notes: `${template.name} for ${doNumber}.`,
      is_required_for_do_closure: true,
      blocked_reason: blocked ? 'Missing required customs documents' : null,
    };
  });
}

function summarizeTasks(tasks: LogisticsTask[]): DeliveryOrder['task_summary'] {
  return {
    total_tasks: tasks.length,
    completed_tasks: tasks.filter((task) => task.status === 'COMPLETED').length,
    blocked_tasks: tasks.filter((task) => task.status === 'BLOCKED').length,
    required_tasks_remaining: tasks.filter((task) => task.is_required_for_do_closure && task.status !== 'COMPLETED').length,
  };
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function calculateDelayDays(basisDate: string | null, deadline: string) {
  if (!basisDate) {
    return 0;
  }

  const basis = Date.parse(`${basisDate}T00:00:00.000Z`);
  const target = Date.parse(`${deadline}T00:00:00.000Z`);

  if (Number.isNaN(basis) || Number.isNaN(target)) {
    return 0;
  }

  return Math.max(0, Math.round((basis - target) / 86_400_000));
}
