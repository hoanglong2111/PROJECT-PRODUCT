import { z } from 'zod';

/**
 * Runtime contract schemas for the highest-value API responses. These intentionally
 * describe only the fields the frontend depends on and use `.passthrough()` so extra
 * backend fields never trigger false warnings. They are checked dev-only via
 * `parseContract` to surface contract drift between FE and the (mock/real) backend.
 */

const nullableString = z.string().nullable();

export const deliveryOrderScreenSchema = z
  .object({
    id: z.string(),
    order_info: z
      .object({
        order_number: z.string(),
        status: z.string(),
      })
      .passthrough(),
    product_details: z.object({}).passthrough(),
    sap_integration: z.object({}).passthrough(),
    source_lines: z.array(z.unknown()),
    logistics_shipping: z
      .object({
        shipping_method: z.string(),
        missing_documents: z.array(z.string()),
      })
      .passthrough(),
    warehouse_tracking: z
      .object({
        actual_entry_date: nullableString,
      })
      .passthrough(),
    task_summary: z
      .object({
        total_tasks: z.number(),
        completed_tasks: z.number(),
        blocked_tasks: z.number(),
        required_tasks_remaining: z.number(),
      })
      .passthrough(),
    flow_tags: z.array(z.string()),
  })
  .passthrough();

export const deliveryOrderScreenListSchema = z.array(deliveryOrderScreenSchema);

export const shipmentRecordSchema = z
  .object({
    id: z.string(),
    shipment_number: z.string(),
    status: z.string(),
    shipping_mode: z.string(),
    customs: z
      .object({
        stream: z.string(),
        lane_status: z.string(),
      })
      .passthrough(),
    milestones: z.array(z.unknown()),
    documents: z.array(z.unknown()),
    costs: z.array(z.unknown()),
    po_tasks: z.array(z.unknown()),
  })
  .passthrough();

export const shipmentRecordListSchema = z.array(shipmentRecordSchema);

export const domesticTransportOrderSchema = z
  .object({
    id: z.string(),
    dto_no: z.string(),
    status: z.string(),
    quote_amount: z.union([z.number(), z.string()]).nullable().optional(),
    quote_currency: nullableString.optional(),
  })
  .passthrough();

export const domesticTransportOrderListSchema = z.array(domesticTransportOrderSchema);

export const purchaseOrderListItemSchema = z
  .object({
    id: z.string(),
    po_no: z.string(),
    status: z.string(),
  })
  .passthrough();

export const purchaseOrderListSchema = z.array(purchaseOrderListItemSchema);

export const currencyRateSchema = z
  .object({
    code: z.string(),
    vnd_rate: z.number(),
  })
  .passthrough();

export const currencyRateListSchema = z.array(currencyRateSchema);

export const quotationRequestListItemSchema = z
  .object({
    id: z.string(),
    rfq_no: z.string(),
    status: z.string(),
  })
  .passthrough();

export const quotationRequestListSchema = z.array(quotationRequestListItemSchema);
