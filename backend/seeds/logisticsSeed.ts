import { existsSync, readFileSync } from 'node:fs';

import type {
  BusinessFlowTag,
  DeliveryOrder,
  LogisticsTask,
  PurchaseOrder,
  TaskRole,
  UserRef,
} from '../domain/logistics';

type MasterRow = {
  accountingStaff: string;
  cargoReadyDate: string;
  cls: string;
  contract: string;
  customerProgress: string;
  docsProgress: string;
  docsStaff: string;
  docsVendor: string;
  etd: string;
  eta: string;
  freight: string;
  hsCode: string;
  incoterm: string;
  itemName: string;
  origin: string;
  packing: string;
  salesProgress: string;
  salesStaff: string;
  salesVendor: string;
  shipper: string;
  truckingProgress: string;
  truckingStaff: string;
  truckingVendor: string;
  vendorProgress: string;
  warehouseDeadline: string;
};

type ParsedPoCode = {
  components: string[];
  formatType: 'KBI_STANDARD' | 'KBI_GROUPED' | 'EXTERNAL_EXCEPTION' | 'UNKNOWN';
  lot: string | null;
  vendorCode: string;
};

const defaultMasterCsvPath = '/home/hoanglong/Bản tải về/FDS - KBI - Tracking System - May 2026 - Master.csv';
const masterCsvPath = process.env.MASTER_CSV_PATH ?? defaultMasterCsvPath;
const baseDate = '2026-05-20';
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

const masterRows = loadMasterRows(masterCsvPath);
const {
  deliveryOrders,
  logisticsTasks,
  purchaseOrders,
} = buildMasterSeed(masterRows);

export { deliveryOrders, logisticsTasks, purchaseOrders };

export const logisticsSnapshotSeeds: Record<string, unknown> = {
  purchase_orders: purchaseOrders,
  delivery_orders: deliveryOrders,
  tasks: logisticsTasks,
};

function loadMasterRows(path: string): MasterRow[] {
  if (!existsSync(path)) {
    return [];
  }

  const csv = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  return parseCsv(csv)
    .slice(2)
    .map((columns) => ({
      accountingStaff: cell(columns, 25),
      cargoReadyDate: cell(columns, 9),
      cls: cell(columns, 11),
      contract: normalizeContract(cell(columns, 1)),
      customerProgress: cell(columns, 24),
      docsProgress: cell(columns, 17),
      docsStaff: cell(columns, 18),
      docsVendor: cell(columns, 19),
      etd: cell(columns, 12),
      eta: cell(columns, 13),
      freight: cell(columns, 7),
      hsCode: cell(columns, 6),
      incoterm: cell(columns, 4),
      itemName: cell(columns, 3),
      origin: cell(columns, 8),
      packing: cell(columns, 5),
      salesProgress: cell(columns, 14),
      salesStaff: cell(columns, 15),
      salesVendor: cell(columns, 16),
      shipper: cell(columns, 2),
      truckingProgress: cell(columns, 20),
      truckingStaff: cell(columns, 21),
      truckingVendor: cell(columns, 22),
      vendorProgress: cell(columns, 23),
      warehouseDeadline: cell(columns, 10),
    }))
    .filter((row) => row.contract.length > 0);
}

function buildMasterSeed(rows: MasterRow[]) {
  const purchaseOrdersSeed: PurchaseOrder[] = [];
  const deliveryOrdersSeed: DeliveryOrder[] = [];
  const logisticsTasksSeed: LogisticsTask[] = [];
  const seenPoNumbers = new Map<string, number>();

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const parsedPo = parsePoCode(row.contract);
    const poNumber = uniquePoNumber(row.contract, seenPoNumbers);
    const prCode = `PR-2026-${String(rowNumber).padStart(6, '0')}`;
    const doNumber = `DO-2026-${String(rowNumber).padStart(6, '0')}`;
    const prLineId = `pr-line-master-${String(rowNumber).padStart(6, '0')}-001`;
    const poLineId = `po-line-master-${String(rowNumber).padStart(6, '0')}-001`;
    const productionContract = `HD-SX-2026-${String(rowNumber).padStart(6, '0')}`;
    const requestDate = parseDate(row.cargoReadyDate) ?? parseDate(row.warehouseDeadline) ?? addDays(baseDate, index);
    const warehouseDeadline = parseDate(row.warehouseDeadline) ?? parseDate(row.eta) ?? addDays(requestDate, 30);
    const etd = parseDate(row.etd);
    const eta = parseDate(row.eta);
    const cls = parseDate(row.cls) ?? etd ?? addDays(requestDate, 7);
    const quantity = inferQuantity(row.packing, index);
    const itemCode = inferItemCode(rowNumber);
    const itemName = inferItemName(rowNumber);
    const supplierCode = parsedPo.vendorCode || inferSupplierCode(row.shipper, row.contract);
    const shippingMethod = inferShippingMethod(row.freight);
    const documents = inferDocuments(row);
    const missingDocuments = requiredDocuments.filter((documentName) => !documents.includes(documentName));
    const status = inferDeliveryStatus(row, missingDocuments);
    const flowTags = inferFlowTags(parsedPo, poNumber);
    const orderDate = addDays(requestDate, 1);
    const plannedEntryDate = eta ? addDays(eta, 2) : null;
    const delayDays = calculateDelayDays(plannedEntryDate ?? eta, warehouseDeadline);



    purchaseOrdersSeed.push({
      id: `po-master-${String(rowNumber).padStart(6, '0')}`,
      po_number: poNumber,
      source_pr_codes: [prCode],
      line_items: [
        {
          id: poLineId,
          source_pr_code: prCode,
          source_pr_line_id: prLineId,
          item_code: itemCode,
          item_name: itemName,
          quantity,
          unit: inferUnit(row.packing),
          warehouse_deadline_date: warehouseDeadline,
          warehouse_code: 'WH-HCM-01',
        },
      ],
      supplier_code: supplierCode,
      supplier_name: row.shipper || supplierCode,
      status: status === 'DELIVERED' ? 'CLOSED' : status === 'CREATED' ? 'SAP_PENDING' : 'PARTIALLY_DELIVERED',
      order_date: orderDate,
      currency: 'USD',
      total_amount: quantity,
      sap_sync_status: row.shipper ? 'SYNCED' : 'PENDING',
      linked_do_numbers: [doNumber],
      warehouse_code: 'WH-HCM-01',
      flow_tags: flowTags,
    });

    const tasks = buildTasks({
      docsBlocked: missingDocuments.length > 0,
      doNumber,
      index,
      poNumber,
      prCode,
      productionContract,
      warehouseDeadline,
    });
    logisticsTasksSeed.push(...tasks);

    deliveryOrdersSeed.push({
      id: `do-master-${String(rowNumber).padStart(6, '0')}`,
      order_info: {
        request_code: prCode,
        order_number: doNumber,
        tracking_number: null,
        purchase_contract_number: productionContract,
        status,
        notes: compactNotes([row.salesProgress, row.docsProgress, row.truckingProgress, row.customerProgress]),
        xnk_notes: missingDocuments.length > 0 ? `Missing ${missingDocuments.join(', ')}.` : 'Document set is ready.',
      },
      product_details: {
        item_name_requested: itemName,
        unit: inferUnit(row.packing),
        quantity,
        lot_number: parsedPo.lot,
        lot_unit_quantity: null,
        lot_unit_type: null,
        packaging_type: row.packing || null,
      },
      source_lines: [
        {
          id: `do-source-master-${String(rowNumber).padStart(6, '0')}-001`,
          po_number: poNumber,
          po_line_id: poLineId,
          request_code: prCode,
          pr_line_id: prLineId,
          item_code: itemCode,
          item_name: itemName,
          quantity,
          unit: inferUnit(row.packing),
        },
      ],
      sap_integration: {
        supplier_code: supplierCode,
        supplier_name: row.shipper || supplierCode,
        actual_item_code: itemCode,
        raw_date: orderDate,
        po_number: poNumber,
        sync_status: row.shipper ? 'SYNCED' : 'SYNC_INCOMPLETE',
      },
      logistics_shipping: {
        incoterms: row.incoterm || 'PENDING',
        shipping_method: shippingMethod,
        shipping_line: row.salesVendor || row.docsVendor || row.truckingVendor || null,
        vessel_code: null,
        port_of_departure: row.origin || 'Origin pending',
        port_of_destination: 'VNSGN - Cat Lai',
        documents_list: documents,
        missing_documents: missingDocuments,
        cut_off_date: cls,
        etd_planned: etd,
        eta_planned: eta,
      },
      warehouse_tracking: {
        warehouse_code: 'WH-HCM-01',
        production_ready_date: requestDate,
        warehouse_deadline: warehouseDeadline,
        planned_entry_date: plannedEntryDate,
        actual_entry_date: status === 'DELIVERED' ? plannedEntryDate : null,
        delay_days: calculateDelayDays(plannedEntryDate ?? eta, warehouseDeadline),
      },
      finance_tax: {
        import_tax_rate: null,
        tax_amount: null,
        currency: 'VND',
        tax_payment_deadline: eta ? addDays(eta, 1) : null,
        insurance: null,
      },
      task_summary: summarizeTasks(tasks),
      flow_tags: flowTags,
    });
  });

  return {
    deliveryOrders: deliveryOrdersSeed,
    logisticsTasks: logisticsTasksSeed,
    purchaseOrders: purchaseOrdersSeed,
  };
}

function parseCsv(input: string) {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(field);
      if (row.some((value) => value.trim().length > 0)) {
        rows.push(row);
      }
      field = '';
      row = [];
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim().length > 0)) {
    rows.push(row);
  }

  return rows;
}

function parsePoCode(value: string): ParsedPoCode {
  const normalized = normalizeContract(value);
  const components = extractPoComponents(normalized);
  const lot = normalized.match(/\(\s*lot\s*([^)]+)\)/i)?.[1]?.trim() ?? normalized.match(/\blot\s*([0-9A-Za-z]+)/i)?.[1]?.trim() ?? null;
  const firstKbi = components.find((component) => component.startsWith('KBI-'));
  const vendorCode = firstKbi?.match(/^KBI-([A-Z0-9]+)-/i)?.[1]?.toUpperCase() ?? '';
  const formatType = components.length > 1
    ? 'KBI_GROUPED'
    : firstKbi
      ? 'KBI_STANDARD'
      : normalized.includes('KBI') || normalized === 'UPS' || normalized.includes('/') || normalized.includes('.')
        ? 'EXTERNAL_EXCEPTION'
        : 'UNKNOWN';

  return {
    components,
    formatType,
    lot,
    vendorCode,
  };
}

function extractPoComponents(value: string) {
  const normalized = value.replace(/\s+/g, ' ');
  const matches = normalized.match(/KBI-\s*[A-Z0-9]+-\s*\d{4}/gi) ?? [];
  const cleaned = matches.map((match) => match.replace(/\s+/g, '').toUpperCase());

  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : [normalized];
}

function uniquePoNumber(value: string, seen: Map<string, number>) {
  const normalized = normalizeContract(value);
  const current = seen.get(normalized) ?? 0;
  seen.set(normalized, current + 1);
  return current === 0 ? normalized : `${normalized} #${current + 1}`;
}

function normalizeContract(value: string) {
  return value
    .split(/\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+\|/g, ' |')
    .replace(/\|\s+/g, '| ')
    .trim();
}

function buildTasks({
  docsBlocked,
  doNumber,
  index,
  poNumber,
  prCode,
  productionContract,
  warehouseDeadline,
}: {
  docsBlocked: boolean;
  doNumber: string;
  index: number;
  poNumber: string;
  prCode: string;
  productionContract: string;
  warehouseDeadline: string;
}): LogisticsTask[] {
  const taskTemplates: Array<{ assignee: UserRef; name: string; offset: number; role: TaskRole }> = [
    { assignee: seedUsers.sale, name: 'Confirm sales progress from Master Sheet', offset: -12, role: 'Sale Staff' },
    { assignee: seedUsers.port, name: 'Update booking, ETD and ETA', offset: -8, role: 'Port Officer' },
    { assignee: seedUsers.customs, name: 'Check document set for customs', offset: -5, role: 'Customs Officer' },
    { assignee: seedUsers.finance, name: 'Prepare debit note and accounting follow-up', offset: -2, role: 'Finance Officer' },
    { assignee: seedUsers.warehouse, name: 'Confirm warehouse entry slot', offset: -1, role: 'Warehouse Staff' },
  ];

  return taskTemplates.map((template, taskIndex) => {
    const taskNumber = index * 10 + taskIndex + 1;
    const blocked = docsBlocked && template.role === 'Customs Officer';
    const completed = !blocked && index % 5 === 0;

    return {
      task_id: `TASK-2026-${String(taskNumber).padStart(6, '0')}`,
      do_number: doNumber,
      hbl_number: null,
      request_code: prCode,
      po_number: poNumber,
      production_contract_number: productionContract,
      task_name: template.name,
      role: template.role,
      assignee: template.assignee,
      progress: completed ? 100 : blocked ? 20 : 35,
      created_at: `${addDays(baseDate, -2)}T09:00:00+07:00`,
      assigned_at: `${addDays(baseDate, -2)}T10:00:00+07:00`,
      completed_at: completed ? `${addDays(baseDate, -1)}T15:30:00+07:00` : null,
      status: completed ? 'COMPLETED' : blocked ? 'BLOCKED' : 'IN_PROGRESS',
      priority: blocked ? 'HIGH' : 'MEDIUM',
      due_date: addDays(warehouseDeadline, template.offset),
      notes: `${template.name} for ${poNumber}.`,
      is_required_for_do_closure: true,
      blocked_reason: blocked ? 'Missing required customs documents from Master CSV row.' : null,
    };
  });
}

function inferFlowTags(parsedPo: ParsedPoCode, poNumber: string): BusinessFlowTag[] {
  if (parsedPo.components.length > 1 || /[&+]/.test(poNumber)) {
    return ['CONTAINER_CONSOLIDATION'];
  }

  if (parsedPo.lot) {
    return ['PARTIAL_DELIVERY'];
  }

  return ['LINEAR'];
}

function inferDeliveryStatus(row: MasterRow, missingDocuments: string[]): DeliveryOrder['order_info']['status'] {
  const progress = `${row.salesProgress} ${row.docsProgress} ${row.truckingProgress} ${row.vendorProgress} ${row.customerProgress}`.toLowerCase();

  if (progress.includes('hủy') || progress.includes('cancel')) {
    return 'CANCELLED';
  }

  if (progress.includes('hoàn tất') || progress.includes('done') || progress.includes('complete')) {
    return 'DELIVERED';
  }

  if (missingDocuments.length > 0) {
    return 'CUSTOMS_PROCESSING';
  }

  if (row.eta) {
    return 'IN_TRANSIT';
  }

  if (row.etd) {
    return 'CONFIRMED';
  }

  return 'CREATED';
}

function inferDocuments(row: MasterRow) {
  const text = `${row.packing} ${row.docsProgress} ${row.vendorProgress}`.toLowerCase();
  const documents = new Set<string>();

  if (text.includes('ci') || text.includes('invoice') || text.includes('hoá đơn') || text.includes('hoa don')) {
    documents.add('Invoice');
  }
  if (text.includes('pl') || text.includes('packing')) {
    documents.add('Packing List');
  }
  if (row.etd || row.eta) {
    documents.add('B/L');
  }
  if (text.includes('co') || text.includes('c/o')) {
    documents.add('CO');
  }

  return Array.from(documents);
}

function inferShippingMethod(value: string): DeliveryOrder['logistics_shipping']['shipping_method'] {
  const normalized = value.toLowerCase();
  if (normalized.includes('air')) {
    return 'AIR';
  }
  if (normalized.includes('road') || normalized.includes('truck')) {
    return 'ROAD';
  }
  return 'SEA';
}

function inferQuantity(packing: string, index: number) {
  const numbers = Array.from(packing.matchAll(/\d+(?:[.,]\d+)?/g))
    .map((match) => Number(match[0].replace(',', '.')))
    .filter((value) => Number.isFinite(value) && value > 0);

  return Math.max(1, Math.round(numbers[0] ?? index + 1));
}

function inferUnit(packing: string) {
  const normalized = packing.toLowerCase();
  if (normalized.includes('kg') || normalized.includes('kgs')) {
    return 'kg';
  }
  if (normalized.includes('pallet')) {
    return 'pallet';
  }
  if (normalized.includes('ctn') || normalized.includes('carton')) {
    return 'ctn';
  }
  if (normalized.includes('cont') || normalized.includes('gp') || normalized.includes('hc')) {
    return 'container';
  }
  return 'lot';
}

function inferItemCode(index: number) {
  return `KBI-ITEM-${String(index).padStart(6, '0')}`;
}

function inferItemName(index: number) {
  const families = ['Imported component kit', 'Replacement parts set', 'Assembly material pack', 'Service spare bundle'];
  return `${families[(index - 1) % families.length]} ${String(index).padStart(4, '0')}`;
}

function inferSupplierCode(shipper: string, contract: string) {
  const parsed = parsePoCode(contract);
  if (parsed.vendorCode) {
    return parsed.vendorCode;
  }

  const words = shipper.match(/[A-Za-z0-9]+/g) ?? ['EXT'];
  if (words.length === 1) {
    return words[0].slice(0, 12).toUpperCase();
  }

  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function parseDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toUpperCase() === 'X') {
    return null;
  }

  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return toIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const year = Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3]);
    return toIsoDate(year, Number(slash[1]), Number(slash[2]));
  }

  return null;
}

function toIsoDate(year: number, month: number, day: number) {
  const value = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(value.getTime())) {
    return null;
  }
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

function summarizeTasks(tasks: LogisticsTask[]): DeliveryOrder['task_summary'] {
  return {
    total_tasks: tasks.length,
    completed_tasks: tasks.filter((task) => task.status === 'COMPLETED').length,
    blocked_tasks: tasks.filter((task) => task.status === 'BLOCKED').length,
    required_tasks_remaining: tasks.filter((task) => task.is_required_for_do_closure && task.status !== 'COMPLETED').length,
  };
}

function compactNotes(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean).join(' | ');
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function cell(columns: string[], index: number) {
  return (columns[index] ?? '').trim();
}
