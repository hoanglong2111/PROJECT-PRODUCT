import type {
  DeliveryOrder,
  LogisticsTask,
  PurchaseOrder,
  PurchaseOrderLineItem,
  PurchaseRequest,
  PurchaseRequestLineItem,
  UserRef,
} from '../domain/logistics';
import { seedUsers as logisticsSeedUsers } from '../seeds/logisticsSeed';
import { ApiError } from '../utils/errors';
import type { DatabaseClient } from '../domain/types';

type SnapshotKey = 'purchase_requests' | 'purchase_orders' | 'delivery_orders' | 'tasks';

type Row = Record<string, unknown>;

const MAX_BATCH_INSERT_PARAMS = 60_000;

export async function readNormalizedSnapshot<T>(key: string, client: DatabaseClient): Promise<T> {
  if (key === 'purchase_orders') {
    return (await readPurchaseOrders(client)) as T;
  }

  if (key === 'delivery_orders') {
    return (await readDeliveryOrders(client)) as T;
  }

  if (key === 'tasks') {
    return (await readTasks(client)) as T;
  }

  throw new Error(`Normalized snapshot "${key}" does not exist.`);
}

export async function writeNormalizedSnapshot<T>(key: string, payload: T, client: DatabaseClient) {
  if (!Array.isArray(payload)) {
    throw new ApiError(400, `Normalized payload for "${key}" must be an array.`);
  }

  if (key === 'purchase_orders') {
    await replacePurchaseOrders(payload as PurchaseOrder[], client);
    return;
  }

  if (key === 'delivery_orders') {
    await replaceDeliveryOrders(payload as DeliveryOrder[], client);
    return;
  }

  if (key === 'tasks') {
    await replaceTasks(payload as LogisticsTask[], client);
    return;
  }

  throw new Error(`Normalized snapshot "${key as SnapshotKey}" does not exist.`);
}

// Deleted readPurchaseRequests

async function readPurchaseOrders(client: DatabaseClient): Promise<PurchaseOrder[]> {
  const [ordersResult, linesResult] = await Promise.all([
    client.query<Row>('SELECT * FROM purchase_orders ORDER BY order_date DESC, po_number DESC'),
    client.query<Row>('SELECT * FROM purchase_order_lines ORDER BY id ASC'),
  ]);
  const linesByOrder = groupBy(linesResult.rows, 'purchase_order_id');

  return ordersResult.rows.map((row) => {
    const lineItems = (linesByOrder.get(stringValue(row.id)) ?? []).map(toPurchaseOrderLine);

    return {
      id: stringValue(row.id),
      po_number: stringValue(row.po_number),
      source_pr_codes: uniqueStrings(lineItems.map((line) => line.source_pr_code)),
      line_items: lineItems,
      supplier_code: stringValue(row.supplier_code),
      supplier_name: stringValue(row.supplier_name),
      status: stringValue(row.status) as PurchaseOrder['status'],
      order_date: dateValue(row.order_date),
      currency: stringValue(row.currency),
      total_amount: numberValue(row.total_amount),
      sap_sync_status: stringValue(row.sap_sync_status) as PurchaseOrder['sap_sync_status'],
      linked_do_numbers: stringArrayValue(row.linked_do_numbers),
      warehouse_code: stringValue(row.warehouse_code),
      flow_tags: stringArrayValue(row.flow_tags) as PurchaseOrder['flow_tags'],
    };
  });
}

async function readDeliveryOrders(client: DatabaseClient): Promise<DeliveryOrder[]> {
  const [ordersResult, sourceLinesResult, taskSummaryResult] = await Promise.all([
    client.query<Row>('SELECT * FROM shipments ORDER BY created_at DESC, order_number DESC'),
    client.query<Row>('SELECT * FROM shipment_source_lines ORDER BY id ASC'),
    client.query<Row>('SELECT do_number, status, is_required_for_do_closure FROM logistics_tasks'),
  ]);
  const sourceLinesByOrder = groupBy(sourceLinesResult.rows, 'delivery_order_id');
  const taskSummaryByDo = buildTaskSummaries(taskSummaryResult.rows);

  return ordersResult.rows.map((row) => {
    const id = stringValue(row.id);
    const orderNumber = stringValue(row.order_number);

    return {
      id,
      order_info: {
        request_code: '',
        order_number: orderNumber,
        tracking_number: nullableStringValue(row.tracking_number),
        purchase_contract_number: stringValue(row.purchase_contract_number),
        status: stringValue(row.status) as DeliveryOrder['order_info']['status'],
        notes: stringValue(row.notes),
        xnk_notes: stringValue(row.xnk_notes),
      },
      product_details: {
        item_name_requested: stringValue(row.item_name),
        unit: stringValue(row.unit),
        quantity: numberValue(row.quantity),
        lot_number: null,
        lot_unit_quantity: null,
        lot_unit_type: null,
        packaging_type: null,
      },
      source_lines: (sourceLinesByOrder.get(id) ?? []).map(toDeliverySourceLine),
      sap_integration: {
        supplier_code: nullableStringValue(row.supplier_code),
        supplier_name: nullableStringValue(row.supplier_name),
        actual_item_code: nullableStringValue(row.item_code),
        raw_date: nullableDateValue(row.sap_raw_date),
        po_number: nullableStringValue(row.po_number),
        sync_status: stringValue(row.sap_sync_status) as DeliveryOrder['sap_integration']['sync_status'],
      },
      logistics_shipping: {
        incoterms: stringValue(row.incoterms) || 'FOB',
        shipping_method: (stringValue(row.shipping_method) || 'SEA') as DeliveryOrder['logistics_shipping']['shipping_method'],
        shipping_line: nullableStringValue(row.carrier),
        vessel_code: nullableStringValue(row.vessel_flight),
        port_of_departure: stringValue(row.pol) || 'Supplier port pending',
        port_of_destination: stringValue(row.pod) || 'VNSGN - Cat Lai',
        documents_list: stringArrayValue(row.documents_list),
        missing_documents: stringArrayValue(row.missing_documents),
        cut_off_date: nullableDateValue(row.etd) ? addDays(stringValue(row.etd), -2) : null,
        etd_planned: nullableDateValue(row.etd),
        eta_planned: nullableDateValue(row.eta),
      },
      warehouse_tracking: {
        warehouse_code: stringValue(row.warehouse_code),
        production_ready_date: null,
        warehouse_deadline: dateValue(row.warehouse_deadline),
        planned_entry_date: nullableDateValue(row.planned_entry_date),
        actual_entry_date: nullableDateValue(row.actual_entry_date),
        delay_days: numberValue(row.delay_days),
      },
      finance_tax: {
        import_tax_rate: null,
        tax_amount: null,
        currency: 'VND',
        tax_payment_deadline: null,
        insurance: null,
      },
      task_summary: taskSummaryByDo.get(orderNumber) ?? emptyTaskSummary(),
      flow_tags: stringArrayValue(row.flow_tags) as DeliveryOrder['flow_tags'],
    };
  });
}

async function readTasks(client: DatabaseClient): Promise<LogisticsTask[]> {
  const [tasksResult, users] = await Promise.all([
    client.query<Row>('SELECT * FROM logistics_tasks ORDER BY due_date ASC, task_id ASC'),
    readUserRefs(client),
  ]);

  return tasksResult.rows.map((row) => ({
    task_id: stringValue(row.task_id),
    do_number: stringValue(row.do_number),
    hbl_number: nullableStringValue(row.hbl_number),
    request_code: stringValue(row.request_code),
    po_number: nullableStringValue(row.po_number),
    production_contract_number: stringValue(row.production_contract_number),
    task_name: stringValue(row.task_name),
    role: stringValue(row.role) as LogisticsTask['role'],
    assignee: userRefValue(row.assignee_id, users, logisticsSeedUsers.warehouse),
    progress: numberValue(row.progress),
    created_at: dateTimeValue(row.created_at),
    assigned_at: null,
    completed_at: nullableDateTimeValue(row.completed_at),
    status: stringValue(row.status) as LogisticsTask['status'],
    priority: stringValue(row.priority) as LogisticsTask['priority'],
    due_date: dateValue(row.due_date),
    notes: stringValue(row.notes),
    is_required_for_do_closure: booleanValue(row.is_required_for_do_closure),
    blocked_reason: nullableStringValue(row.blocked_reason),
  }));
}

// Deleted replacePurchaseRequests

async function replacePurchaseOrders(orders: PurchaseOrder[], client: DatabaseClient) {
  await client.query('DELETE FROM purchase_order_lines');
  await client.query('DELETE FROM purchase_orders');

  const updatedAt = new Date();
  await batchInsert(
    client,
    'purchase_orders',
    [
      'id',
      'po_number',
      'supplier_code',
      'supplier_name',
      'status',
      'order_date',
      'currency',
      'total_amount',
      'sap_sync_status',
      'linked_do_numbers',
      'warehouse_code',
      'flow_tags',
      'updated_at',
    ],
    orders.map((order) => [
        order.id,
        order.po_number,
        order.supplier_code,
        order.supplier_name,
        order.status,
        order.order_date,
        order.currency,
        order.total_amount,
        order.sap_sync_status,
        order.linked_do_numbers,
        order.warehouse_code,
        order.flow_tags,
        updatedAt,
      ]),
  );

  await batchInsert(
    client,
    'purchase_order_lines',
    [
      'id',
      'purchase_order_id',
      'source_pr_code',
      'source_pr_line_id',
      'item_code',
      'item_name',
      'quantity',
      'unit',
      'warehouse_deadline_date',
      'warehouse_code',
    ],
    orders.flatMap((order) =>
      order.line_items.map((line) => [
        line.id,
        order.id,
        line.source_pr_code,
        line.source_pr_line_id,
        line.item_code,
        line.item_name,
        line.quantity,
        line.unit,
        line.warehouse_deadline_date,
        line.warehouse_code,
      ]),
    ),
  );
}

async function replaceDeliveryOrders(orders: DeliveryOrder[], client: DatabaseClient) {
  await client.query('DELETE FROM shipment_source_lines');
  await client.query('DELETE FROM shipments');

  const updatedAt = new Date();
  await batchInsert(
    client,
    'shipments',
    [
      'id',
      'order_number',
      'po_number',
      'tracking_number',
      'purchase_contract_number',
      'status',
      'notes',
      'xnk_notes',
      'item_code',
      'item_name',
      'quantity',
      'unit',
      'supplier_code',
      'supplier_name',
      'sap_raw_date',
      'sap_sync_status',
      'warehouse_code',
      'warehouse_deadline',
      'planned_entry_date',
      'actual_entry_date',
      'delay_days',
      'flow_tags',
      'updated_at',
      'incoterms',
      'shipping_method',
      'carrier',
      'vessel_flight',
      'pol',
      'pod',
      'documents_list',
      'missing_documents',
      'etd',
      'eta',
    ],
    orders.map((order) => [
      order.id,
      order.order_info.order_number,
      order.sap_integration.po_number,
      order.order_info.tracking_number,
      order.order_info.purchase_contract_number,
      order.order_info.status,
      order.order_info.notes,
      order.order_info.xnk_notes,
      order.sap_integration.actual_item_code,
      order.product_details.item_name_requested,
      order.product_details.quantity,
      order.product_details.unit,
      order.sap_integration.supplier_code,
      order.sap_integration.supplier_name,
      order.sap_integration.raw_date,
      order.sap_integration.sync_status,
      order.warehouse_tracking.warehouse_code,
      order.warehouse_tracking.warehouse_deadline,
      order.warehouse_tracking.planned_entry_date,
      order.warehouse_tracking.actual_entry_date,
      order.warehouse_tracking.delay_days,
      order.flow_tags,
      updatedAt,
      order.logistics_shipping.incoterms,
      order.logistics_shipping.shipping_method,
      order.logistics_shipping.shipping_line,
      order.logistics_shipping.vessel_code,
      order.logistics_shipping.port_of_departure,
      order.logistics_shipping.port_of_destination,
      order.logistics_shipping.documents_list,
      order.logistics_shipping.missing_documents,
      order.logistics_shipping.etd_planned,
      order.logistics_shipping.eta_planned,
    ]),
  );

  await batchInsert(
    client,
    'shipment_source_lines',
    [
      'id',
      'delivery_order_id',
      'po_number',
      'po_line_id',
      'item_code',
      'item_name',
      'quantity',
      'unit',
    ],
    orders.flatMap((order) =>
      order.source_lines.map((line) => [
        line.id,
        order.id,
        line.po_number,
        line.po_line_id,
        line.item_code,
        line.item_name,
        line.quantity,
        line.unit,
      ]),
    ),
  );
}

async function replaceTasks(tasks: LogisticsTask[], client: DatabaseClient) {
  await client.query('DELETE FROM logistics_tasks');

  const updatedAt = new Date();
  await batchInsert(
    client,
    'logistics_tasks',
    [
      'id',
      'task_id',
      'task_name',
      'role',
      'assignee_id',
      'hbl_number',
      'do_number',
      'request_code',
      'po_number',
      'production_contract_number',
      'priority',
      'status',
      'progress',
      'due_date',
      'completed_at',
      'blocked_reason',
      'notes',
      'is_required_for_do_closure',
      'created_at',
      'updated_at',
    ],
    tasks.map((task) => [
        `task-${task.task_id}`,
        task.task_id,
        task.task_name,
        task.role,
        task.assignee.user_id,
        task.hbl_number,
        task.do_number,
        task.request_code,
        task.po_number,
        task.production_contract_number,
        task.priority,
        task.status,
        task.progress,
        task.due_date,
        task.completed_at,
        task.blocked_reason,
        task.notes,
        task.is_required_for_do_closure,
        task.created_at,
        updatedAt,
      ]),
  );
}

async function readDeliverySideTables(client: DatabaseClient) {
  const [containers, charges, notes, houseBills, documentReviews, customs] = await Promise.all([
    client.query<Row>('SELECT * FROM efms_containers'),
    client.query<Row>('SELECT * FROM finance_charge_lines'),
    client.query<Row>('SELECT * FROM finance_notes'),
    client.query<Row>('SELECT * FROM efms_house_bills'),
    client.query<Row>('SELECT * FROM efms_document_reviews'),
    client.query<Row>('SELECT * FROM customs_declarations'),
  ]);

  return {
    charges: charges.rows,
    containers: containers.rows,
    customs: customs.rows,
    documentReviews: documentReviews.rows,
    houseBills: houseBills.rows,
    notes: notes.rows,
  };
}

async function restoreDeliverySideTables(
  preserved: Awaited<ReturnType<typeof readDeliverySideTables>>,
  deliveryOrderIds: Set<string>,
  client: DatabaseClient,
) {
  await batchInsert(
    client,
    'efms_containers',
    ['id', 'delivery_order_id', 'container_type', 'container_number', 'seal_number', 'vehicle_type', 'vehicle_number'],
    preserved.containers
      .filter((item) => deliveryOrderIds.has(stringValue(item.delivery_order_id)))
      .map((row) => [
        row.id,
        row.delivery_order_id,
        row.container_type,
        row.container_number,
        row.seal_number,
        row.vehicle_type,
        row.vehicle_number,
      ]),
    'ON CONFLICT (id) DO NOTHING',
  );

  await batchInsert(
    client,
    'finance_charge_lines',
    [
      'id',
      'delivery_order_id',
      'charge_type',
      'charge_code',
      'description',
      'amount',
      'currency',
      'is_locked',
      'invoiced_note_id',
      'invoiced_at',
      'created_at',
      'updated_at',
    ],
    preserved.charges
      .filter((item) => deliveryOrderIds.has(stringValue(item.delivery_order_id)))
      .map((row) => [
        row.id,
        row.delivery_order_id,
        row.charge_type,
        row.charge_code,
        row.description,
        row.amount,
        row.currency,
        row.is_locked,
        row.invoiced_note_id,
        row.invoiced_at,
        row.created_at,
        row.updated_at,
      ]),
    'ON CONFLICT (id) DO NOTHING',
  );

  await batchInsert(
    client,
    'finance_notes',
    [
      'id',
      'delivery_order_id',
      'note_number',
      'note_type',
      'accounting_code',
      'status',
      'charge_ids',
      'sla_due_at',
      'issued_at',
      'sent_to_accounting_at',
    ],
    preserved.notes
      .filter((item) => deliveryOrderIds.has(stringValue(item.delivery_order_id)))
      .map((row) => [
        row.id,
        row.delivery_order_id,
        row.note_number,
        row.note_type,
        row.accounting_code,
        row.status,
        row.charge_ids,
        row.sla_due_at,
        row.issued_at,
        row.sent_to_accounting_at,
      ]),
    'ON CONFLICT (id) DO NOTHING',
  );

  await batchInsert(
    client,
    'efms_house_bills',
    [
      'id',
      'delivery_order_id',
      'hbl_number',
      'shipper',
      'consignee',
      'place_of_receipt',
      'place_of_delivery',
      'assigned_to',
      'final_bl_confirmed_at',
      'created_at',
      'updated_at',
    ],
    preserved.houseBills
      .filter((item) => deliveryOrderIds.has(stringValue(item.delivery_order_id)))
      .map((row) => [
        row.id,
        row.delivery_order_id,
        row.hbl_number,
        row.shipper,
        row.consignee,
        row.place_of_receipt,
        row.place_of_delivery,
        row.assigned_to,
        row.final_bl_confirmed_at,
        row.created_at,
        row.updated_at,
      ]),
    'ON CONFLICT (delivery_order_id, hbl_number) DO NOTHING',
  );

  await batchInsert(
    client,
    'efms_document_reviews',
    [
      'id',
      'delivery_order_id',
      'hbl_number',
      'status',
      'draft_bl_attachment_id',
      'commercial_invoice_attachment_id',
      'packing_list_attachment_id',
      'final_bl_attachment_id',
      'cross_check_due_at',
      'cross_checked_at',
      'sla_status',
      'notes',
      'created_by',
      'created_at',
      'updated_at',
    ],
    preserved.documentReviews
      .filter((item) => deliveryOrderIds.has(stringValue(item.delivery_order_id)))
      .map((row) => [
        row.id,
        row.delivery_order_id,
        row.hbl_number,
        row.status,
        row.draft_bl_attachment_id,
        row.commercial_invoice_attachment_id,
        row.packing_list_attachment_id,
        row.final_bl_attachment_id,
        row.cross_check_due_at,
        row.cross_checked_at,
        row.sla_status,
        row.notes,
        row.created_by,
        row.created_at,
        row.updated_at,
      ]),
    'ON CONFLICT (id) DO NOTHING',
  );

  await batchInsert(
    client,
    'customs_declarations',
    [
      'id',
      'delivery_order_id',
      'declaration_number',
      'channel',
      'status',
      'lane_status',
      'telex_released',
      'telex_released_at',
      'submitted_at',
      'cleared_at',
      'notes',
      'updated_by',
      'created_at',
      'updated_at',
    ],
    preserved.customs
      .filter((item) => deliveryOrderIds.has(stringValue(item.delivery_order_id)))
      .map((row) => [
        row.id,
        row.delivery_order_id,
        row.declaration_number,
        row.channel,
        row.status,
        row.lane_status,
        row.telex_released,
        row.telex_released_at,
        row.submitted_at,
        row.cleared_at,
        row.notes,
        row.updated_by,
        row.created_at,
        row.updated_at,
      ]),
    'ON CONFLICT (delivery_order_id) DO NOTHING',
  );
}

async function batchInsert(
  client: DatabaseClient,
  table: string,
  columns: string[],
  rows: unknown[][],
  conflictClause = '',
) {
  if (rows.length === 0) {
    return;
  }

  const batchSize = Math.max(1, Math.floor(MAX_BATCH_INSERT_PARAMS / columns.length));
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    const values: unknown[] = [];
    const placeholders = batch.map((row) => {
      if (row.length !== columns.length) {
        throw new Error(`Invalid batch insert row for ${table}: expected ${columns.length}, got ${row.length}.`);
      }

      return `(${row
        .map((value) => {
          values.push(value);
          return `$${values.length}`;
        })
        .join(', ')})`;
    });

    await client.query(
      `
        INSERT INTO ${table} (${columns.join(', ')})
        VALUES ${placeholders.join(', ')}
        ${conflictClause}
      `,
      values,
    );
  }
}

async function readUserRefs(client: DatabaseClient) {
  const users = new Map<string, UserRef>();
  for (const user of Object.values(logisticsSeedUsers)) {
    users.set(user.user_id, user);
  }

  const result = await client.query<Row>('SELECT id, full_name, department FROM app_users');
  for (const row of result.rows) {
    users.set(stringValue(row.id), {
      user_id: stringValue(row.id),
      name: stringValue(row.full_name),
      department: stringValue(row.department),
    });
  }

  return users;
}

// Deleted toPurchaseRequestLine

function toPurchaseOrderLine(row: Row): PurchaseOrderLineItem {
  return {
    id: stringValue(row.id),
    source_pr_code: stringValue(row.source_pr_code),
    source_pr_line_id: stringValue(row.source_pr_line_id),
    item_code: stringValue(row.item_code),
    item_name: stringValue(row.item_name),
    quantity: numberValue(row.quantity),
    unit: stringValue(row.unit),
    warehouse_deadline_date: dateValue(row.warehouse_deadline_date),
    warehouse_code: stringValue(row.warehouse_code),
  };
}

function toDeliverySourceLine(row: Row): DeliveryOrder['source_lines'][number] {
  return {
    id: stringValue(row.id),
    po_number: stringValue(row.po_number),
    po_line_id: stringValue(row.po_line_id),
    request_code: stringValue(row.request_code),
    pr_line_id: stringValue(row.pr_line_id),
    item_code: stringValue(row.item_code),
    item_name: stringValue(row.item_name),
    quantity: numberValue(row.quantity),
    unit: stringValue(row.unit),
  };
}

function buildTaskSummaries(rows: Row[]) {
  const summaries = new Map<string, DeliveryOrder['task_summary']>();

  for (const row of rows) {
    const doNumber = stringValue(row.do_number);
    if (!doNumber) {
      continue;
    }

    const summary = summaries.get(doNumber) ?? emptyTaskSummary();
    const status = stringValue(row.status);
    summary.total_tasks += 1;

    if (status === 'COMPLETED') {
      summary.completed_tasks += 1;
    }

    if (status === 'BLOCKED') {
      summary.blocked_tasks += 1;
    }

    if (booleanValue(row.is_required_for_do_closure) && status !== 'COMPLETED') {
      summary.required_tasks_remaining += 1;
    }

    summaries.set(doNumber, summary);
  }

  return summaries;
}

function emptyTaskSummary(): DeliveryOrder['task_summary'] {
  return {
    total_tasks: 0,
    completed_tasks: 0,
    blocked_tasks: 0,
    required_tasks_remaining: 0,
  };
}

function groupBy(rows: Row[], key: string) {
  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const value = stringValue(row[key]);
    const current = grouped.get(value) ?? [];
    current.push(row);
    grouped.set(value, current);
  }
  return grouped;
}

function userRefValue(value: unknown, users: Map<string, UserRef>, fallback: UserRef): UserRef {
  const userId = nullableStringValue(value);
  return userId ? users.get(userId) ?? { ...fallback, user_id: userId } : fallback;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function stringValue(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function nullableStringValue(value: unknown) {
  const text = stringValue(value);
  return text.length > 0 ? text : null;
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function booleanValue(value: unknown) {
  return value === true || value === 'true';
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function dateValue(value: unknown) {
  return nullableDateValue(value) ?? new Date().toISOString().slice(0, 10);
}

function nullableDateValue(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function dateTimeValue(value: unknown) {
  return nullableDateTimeValue(value) ?? new Date().toISOString();
}

function nullableDateTimeValue(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function addDays(dateStr: string, days: number) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
