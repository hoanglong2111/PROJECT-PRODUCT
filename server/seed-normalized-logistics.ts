import 'dotenv/config';

import { readFile } from 'node:fs/promises';
import pg, { type PoolClient } from 'pg';

import {
  deliveryOrders as fixtureDeliveryOrders,
  logisticsTasks as fixtureLogisticsTasks,
  purchaseOrders as fixturePurchaseOrders,
  purchaseRequests as fixturePurchaseRequests,
} from './seeds/logisticsSeed';
import type { DeliveryOrder, LogisticsTask, PurchaseOrder, PurchaseRequest } from '../src/models/logistics';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/kbfe';
const RESET_NORMALIZED_SEED = process.env.RESET_NORMALIZED_SEED === '1';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

type NormalizedSeedData = {
  deliveryOrders: DeliveryOrder[];
  logisticsTasks: LogisticsTask[];
  purchaseOrders: PurchaseOrder[];
  purchaseRequests: PurchaseRequest[];
};

async function main() {
  const migrationSql = await readFile(new URL('./migrations/001_normalized_logistics_schema.sql', import.meta.url), 'utf8');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
  await client.query(migrationSql);
  await client.query(`
    ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS sap_object_id TEXT;
    ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS sap_raw_payload JSONB;
    ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS sap_synced_at TIMESTAMPTZ;
    ALTER TABLE logistics_attachments ADD COLUMN IF NOT EXISTS mime_type TEXT;
    ALTER TABLE logistics_attachments ADD COLUMN IF NOT EXISTS size_bytes INTEGER;
  `);
    const seedData = loadSeedData();

    if (RESET_NORMALIZED_SEED) {
      await client.query(`
        TRUNCATE
          audit_logs,
          finance_notes,
          finance_charge_lines,
          logistics_attachments,
          logistics_tasks,
          efms_containers,
          efms_transport_records,
          delivery_order_source_lines,
          delivery_orders,
          purchase_order_lines,
          purchase_orders,
          purchase_request_lines,
          purchase_requests
        RESTART IDENTITY CASCADE
      `);
    }

    for (const request of seedData.purchaseRequests) {
      await client.query(
        `
          INSERT INTO purchase_requests (
            id, requested_order_id, item_code, item_name, quantity, unit, priority,
            requested_order_date, adjusted_date, warehouse_deadline_date, production_contract_number,
            requester_id, purchasing_manager_id, status, notes, actual_warehouse_entry_date,
            supplier_expected_delivery_date, expected_arrival_date, delay_days, warehouse_code, flow_tags,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW())
          ON CONFLICT (id) DO UPDATE SET
            requested_order_id = EXCLUDED.requested_order_id,
            item_code = EXCLUDED.item_code,
            item_name = EXCLUDED.item_name,
            quantity = EXCLUDED.quantity,
            unit = EXCLUDED.unit,
            priority = EXCLUDED.priority,
            requested_order_date = EXCLUDED.requested_order_date,
            adjusted_date = EXCLUDED.adjusted_date,
            warehouse_deadline_date = EXCLUDED.warehouse_deadline_date,
            production_contract_number = EXCLUDED.production_contract_number,
            requester_id = EXCLUDED.requester_id,
            purchasing_manager_id = EXCLUDED.purchasing_manager_id,
            status = EXCLUDED.status,
            notes = EXCLUDED.notes,
            actual_warehouse_entry_date = EXCLUDED.actual_warehouse_entry_date,
            supplier_expected_delivery_date = EXCLUDED.supplier_expected_delivery_date,
            expected_arrival_date = EXCLUDED.expected_arrival_date,
            delay_days = EXCLUDED.delay_days,
            warehouse_code = EXCLUDED.warehouse_code,
            flow_tags = EXCLUDED.flow_tags,
            updated_at = NOW()
        `,
        [
          request.id,
          request.requested_order_id,
          request.item_code,
          request.item_name,
          request.quantity,
          request.unit,
          request.priority,
          request.requested_order_date,
          request.adjusted_date,
          request.warehouse_deadline_date,
          request.production_contract_number,
          request.requester.user_id,
          request.purchasing_manager.user_id,
          request.status,
          request.notes,
          request.actual_warehouse_entry_date,
          request.supplier_expected_delivery_date,
          request.expected_arrival_date,
          request.delay_days,
          request.warehouse_code,
          request.flow_tags,
        ],
      );

      for (const line of request.line_items) {
        await client.query(
          `
            INSERT INTO purchase_request_lines (
              id, purchase_request_id, item_code, item_name, quantity, unit,
              warehouse_deadline_date, warehouse_code, production_contract_number,
              linked_po_numbers, linked_do_numbers
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (id) DO UPDATE SET
              purchase_request_id = EXCLUDED.purchase_request_id,
              item_code = EXCLUDED.item_code,
              item_name = EXCLUDED.item_name,
              quantity = EXCLUDED.quantity,
              unit = EXCLUDED.unit,
              warehouse_deadline_date = EXCLUDED.warehouse_deadline_date,
              warehouse_code = EXCLUDED.warehouse_code,
              production_contract_number = EXCLUDED.production_contract_number,
              linked_po_numbers = EXCLUDED.linked_po_numbers,
              linked_do_numbers = EXCLUDED.linked_do_numbers
          `,
          [
            line.id,
            request.id,
            line.item_code,
            line.item_name,
            line.quantity,
            line.unit,
            line.warehouse_deadline_date,
            line.warehouse_code,
            line.production_contract_number,
            line.linked_po_numbers,
            line.linked_do_numbers,
          ],
        );
      }
    }

    for (const order of seedData.purchaseOrders) {
      await client.query(
        `
          INSERT INTO purchase_orders (
            id, po_number, supplier_code, supplier_name, status, order_date, currency,
            total_amount, sap_sync_status, linked_do_numbers, warehouse_code, flow_tags, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
          ON CONFLICT (id) DO UPDATE SET
            po_number = EXCLUDED.po_number,
            supplier_code = EXCLUDED.supplier_code,
            supplier_name = EXCLUDED.supplier_name,
            status = EXCLUDED.status,
            order_date = EXCLUDED.order_date,
            currency = EXCLUDED.currency,
            total_amount = EXCLUDED.total_amount,
            sap_sync_status = EXCLUDED.sap_sync_status,
            linked_do_numbers = EXCLUDED.linked_do_numbers,
            warehouse_code = EXCLUDED.warehouse_code,
            flow_tags = EXCLUDED.flow_tags,
            updated_at = NOW()
        `,
        [
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
        ],
      );

      for (const line of order.line_items) {
        await client.query(
          `
            INSERT INTO purchase_order_lines (
              id, purchase_order_id, source_pr_code, source_pr_line_id, item_code, item_name,
              quantity, unit, warehouse_deadline_date, warehouse_code
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO UPDATE SET
              purchase_order_id = EXCLUDED.purchase_order_id,
              source_pr_code = EXCLUDED.source_pr_code,
              source_pr_line_id = EXCLUDED.source_pr_line_id,
              item_code = EXCLUDED.item_code,
              item_name = EXCLUDED.item_name,
              quantity = EXCLUDED.quantity,
              unit = EXCLUDED.unit,
              warehouse_deadline_date = EXCLUDED.warehouse_deadline_date,
              warehouse_code = EXCLUDED.warehouse_code
          `,
          [
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
          ],
        );
      }
    }

    for (const order of seedData.deliveryOrders) {
      await client.query(
        `
          INSERT INTO delivery_orders (
            id, order_number, request_code, po_number, tracking_number, purchase_contract_number,
            status, notes, xnk_notes, item_code, item_name, quantity, unit, supplier_code,
            supplier_name, sap_raw_date, sap_sync_status, warehouse_code, warehouse_deadline,
            planned_entry_date, actual_entry_date, delay_days, flow_tags, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW())
          ON CONFLICT (id) DO UPDATE SET
            order_number = EXCLUDED.order_number,
            request_code = EXCLUDED.request_code,
            po_number = EXCLUDED.po_number,
            tracking_number = EXCLUDED.tracking_number,
            purchase_contract_number = EXCLUDED.purchase_contract_number,
            status = EXCLUDED.status,
            notes = EXCLUDED.notes,
            xnk_notes = EXCLUDED.xnk_notes,
            item_code = EXCLUDED.item_code,
            item_name = EXCLUDED.item_name,
            quantity = EXCLUDED.quantity,
            unit = EXCLUDED.unit,
            supplier_code = EXCLUDED.supplier_code,
            supplier_name = EXCLUDED.supplier_name,
            sap_raw_date = EXCLUDED.sap_raw_date,
            sap_sync_status = EXCLUDED.sap_sync_status,
            warehouse_code = EXCLUDED.warehouse_code,
            warehouse_deadline = EXCLUDED.warehouse_deadline,
            planned_entry_date = EXCLUDED.planned_entry_date,
            actual_entry_date = EXCLUDED.actual_entry_date,
            delay_days = EXCLUDED.delay_days,
            flow_tags = EXCLUDED.flow_tags,
            updated_at = NOW()
        `,
        [
          order.id,
          order.order_info.order_number,
          order.order_info.request_code,
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
        ],
      );

      await client.query(
        `
          INSERT INTO efms_transport_records (
            id, delivery_order_id, incoterms, shipping_method, shipping_line, vessel_code,
            booking_number, mbl_number, hbl_number, manifest_number, port_of_departure,
            port_of_destination, cut_off_date, etd_planned, eta_planned, documents_list,
            missing_documents, gross_weight, cbm
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (delivery_order_id) DO UPDATE SET
            incoterms = EXCLUDED.incoterms,
            shipping_method = EXCLUDED.shipping_method,
            shipping_line = EXCLUDED.shipping_line,
            vessel_code = EXCLUDED.vessel_code,
            booking_number = EXCLUDED.booking_number,
            mbl_number = EXCLUDED.mbl_number,
            hbl_number = EXCLUDED.hbl_number,
            manifest_number = EXCLUDED.manifest_number,
            port_of_departure = EXCLUDED.port_of_departure,
            port_of_destination = EXCLUDED.port_of_destination,
            cut_off_date = EXCLUDED.cut_off_date,
            etd_planned = EXCLUDED.etd_planned,
            eta_planned = EXCLUDED.eta_planned,
            documents_list = EXCLUDED.documents_list,
            missing_documents = EXCLUDED.missing_documents,
            gross_weight = EXCLUDED.gross_weight,
            cbm = EXCLUDED.cbm
        `,
        [
          `efms-${order.id}`,
          order.id,
          order.logistics_shipping.incoterms,
          order.logistics_shipping.shipping_method,
          order.logistics_shipping.shipping_line,
          order.logistics_shipping.vessel_code,
          `BOOK-${order.order_info.order_number.slice(-6)}`,
          `MBL-${order.order_info.order_number.slice(-6)}`,
          `HBL-${order.order_info.order_number.slice(-6)}`,
          `MAN-${order.order_info.order_number.slice(-6)}`,
          order.logistics_shipping.port_of_departure,
          order.logistics_shipping.port_of_destination,
          order.logistics_shipping.cut_off_date,
          order.logistics_shipping.etd_planned,
          order.logistics_shipping.eta_planned,
          order.logistics_shipping.documents_list,
          order.logistics_shipping.missing_documents,
          Math.max(1, order.product_details.quantity * 12),
          Math.max(1, Math.round(order.product_details.quantity / 18)),
        ],
      );

      for (const line of order.source_lines) {
        await client.query(
          `
            INSERT INTO delivery_order_source_lines (
              id, delivery_order_id, po_number, po_line_id, request_code, pr_line_id,
              item_code, item_name, quantity, unit
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO UPDATE SET
              delivery_order_id = EXCLUDED.delivery_order_id,
              po_number = EXCLUDED.po_number,
              po_line_id = EXCLUDED.po_line_id,
              request_code = EXCLUDED.request_code,
              pr_line_id = EXCLUDED.pr_line_id,
              item_code = EXCLUDED.item_code,
              item_name = EXCLUDED.item_name,
              quantity = EXCLUDED.quantity,
              unit = EXCLUDED.unit
          `,
          [
            line.id,
            order.id,
            line.po_number,
            line.po_line_id,
            line.request_code,
            line.pr_line_id,
            line.item_code,
            line.item_name,
            line.quantity,
            line.unit,
          ],
        );
      }

      await seedFinanceRows(client, order.id, order.order_info.order_number);
    }

    for (const task of seedData.logisticsTasks) {
      await client.query(
        `
          INSERT INTO logistics_tasks (
            id, task_id, task_name, role, assignee_id, do_number, request_code,
            po_number, production_contract_number, priority, status, progress, due_date,
            completed_at, blocked_reason, notes, is_required_for_do_closure, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
          ON CONFLICT (id) DO UPDATE SET
            task_id = EXCLUDED.task_id,
            task_name = EXCLUDED.task_name,
            role = EXCLUDED.role,
            assignee_id = EXCLUDED.assignee_id,
            do_number = EXCLUDED.do_number,
            request_code = EXCLUDED.request_code,
            po_number = EXCLUDED.po_number,
            production_contract_number = EXCLUDED.production_contract_number,
            priority = EXCLUDED.priority,
            status = EXCLUDED.status,
            progress = EXCLUDED.progress,
            due_date = EXCLUDED.due_date,
            completed_at = EXCLUDED.completed_at,
            blocked_reason = EXCLUDED.blocked_reason,
            notes = EXCLUDED.notes,
            is_required_for_do_closure = EXCLUDED.is_required_for_do_closure,
            updated_at = NOW()
        `,
        [
          `task-${task.task_id}`,
          task.task_id,
          task.task_name,
          task.role,
          task.assignee.user_id,
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
        ],
      );
    }

    await client.query('COMMIT');

    // eslint-disable-next-line no-console
    console.log('Imported normalized logistics seed:', {
      delivery_orders: seedData.deliveryOrders.length,
      logistics_tasks: seedData.logisticsTasks.length,
      purchase_orders: seedData.purchaseOrders.length,
      purchase_requests: seedData.purchaseRequests.length,
      storage: 'normalized_tables',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function loadSeedData(): NormalizedSeedData {
  return {
    deliveryOrders: fixtureDeliveryOrders,
    logisticsTasks: fixtureLogisticsTasks,
    purchaseOrders: fixturePurchaseOrders,
    purchaseRequests: fixturePurchaseRequests,
  };
}

async function seedFinanceRows(client: PoolClient, deliveryOrderId: string, orderNumber: string) {
  const suffix = orderNumber.slice(-6);
  const rows = [
    {
      accountingCode: 'S',
      amount: 12_000_000,
      chargeCode: 'OF',
      chargeType: 'SELLING',
      description: 'Ocean freight receivable',
      id: `charge-selling-${suffix}`,
      isLocked: true,
      noteNumber: `DN-OF-AF-${suffix}`,
      noteType: 'DEBIT_OF_AF',
    },
    {
      accountingCode: 'B',
      amount: 9_500_000,
      chargeCode: 'OF-BUY',
      chargeType: 'BUYING',
      description: 'Ocean freight payable',
      id: `charge-buying-${suffix}`,
      isLocked: false,
      noteNumber: `CN-${suffix}`,
      noteType: 'CREDIT_BUYING',
    },
    {
      accountingCode: 'OBH',
      amount: 1_200_000,
      chargeCode: 'OBH',
      chargeType: 'OBH',
      description: 'On-behalf local charge',
      id: `charge-obh-${suffix}`,
      isLocked: false,
      noteNumber: `OBH-${suffix}`,
      noteType: 'OBH_NOTE',
    },
  ];

  for (const row of rows) {
    await client.query(
      `
        INSERT INTO finance_charge_lines (
          id, delivery_order_id, charge_type, charge_code, description, amount, currency, is_locked, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'VND', $7, NOW())
        ON CONFLICT (id) DO UPDATE SET
          charge_type = EXCLUDED.charge_type,
          charge_code = EXCLUDED.charge_code,
          description = EXCLUDED.description,
          amount = EXCLUDED.amount,
          currency = EXCLUDED.currency,
          is_locked = EXCLUDED.is_locked,
          updated_at = NOW()
      `,
      [row.id, deliveryOrderId, row.chargeType, row.chargeCode, row.description, row.amount, row.isLocked],
    );

    await client.query(
      `
        INSERT INTO finance_notes (
          id, delivery_order_id, note_number, note_type, accounting_code, status, issued_at, sent_to_accounting_at
        )
        VALUES ($1, $2, $3, $4, $5, 'DRAFT', NOW(), NULL)
        ON CONFLICT (id) DO UPDATE SET
          note_number = EXCLUDED.note_number,
          note_type = EXCLUDED.note_type,
          accounting_code = EXCLUDED.accounting_code,
          status = EXCLUDED.status,
          issued_at = EXCLUDED.issued_at,
          sent_to_accounting_at = EXCLUDED.sent_to_accounting_at
      `,
      [`note-${row.id}`, deliveryOrderId, row.noteNumber, row.noteType, row.accountingCode],
    );
  }
}

main()
  .catch((error: Error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to import normalized logistics seed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
