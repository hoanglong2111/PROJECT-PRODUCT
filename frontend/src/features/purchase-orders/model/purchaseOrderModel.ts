import type { Item } from '@shared/api/items';
import type {
  CreatePurchaseOrderV1Payload,
  PoLot,
  PoLotLine,
  PoLotStatus,
  PurchaseOrderLinePayload,
  PurchaseOrderLineV1,
  PurchaseOrderStatusV1,
  PurchaseOrderTypeV1,
  PurchaseOrderV1,
  UpdatePurchaseOrderV1Payload,
} from '@shared/api/purchaseOrders';
import type { QuotationV1 } from '@shared/api/quotations';
import type { QuotationRequestLineV1 } from '@shared/api/quotationRequests';
import type { Currency, Incoterm, TransportMode } from '@shared/api/tradeMasterData';
import { toShippingMode } from '@features/quotations/model/quotationModel';

import {
  STAGE_BY_STATUS,
  stageOrder,
  type PoStageFilterValue,
  type PoStageKey,
  type PoStageStatusCode,
} from './poStageConfig';

export type PurchaseOrderWorkbench = 'list' | 'create' | 'detail';
export type PurchaseOrderStatusFilter = 'all' | PurchaseOrderStatusV1 | PoStageFilterValue | PoStageStatusCode;

export const PAGE_SIZE = 20;
export const purchaseOrderStatusOptions: PurchaseOrderStatusV1[] = [
  'DRAFT',
  'SENT',
  'CONFIRMED',
  'IN_PRODUCTION',
  'READY_TO_SHIP',
  'CANCELLED',
];
export const poTypeOptions: PurchaseOrderTypeV1[] = ['SEA', 'AIR', 'DOMESTIC'];
export const lotStatusOptions: PoLotStatus[] = ['PLANNED', 'READY', 'ASSIGNED_TO_SHIPMENT', 'SHIPPED', 'CANCELLED'];
export const lockedLotStatuses = new Set<PoLotStatus>(['ASSIGNED_TO_SHIPMENT', 'SHIPPED', 'CANCELLED']);
export const PO_DESTINATION_COUNTRY = 'VN';

export type SelectOption = {
  label: string;
  value: string;
};

export type PoLineDraft = {
  clientId: string;
  line_no: number;
  item_id: string;
  item_customs_profile_id: string;
  item_description: string;
  qty_ordered: number;
  unit: string;
  unit_price: number;
  tax_rate: number;
  discount_pct: number;
  gross_weight_kg: number;
  expected_eta_line: string;
  notes: string;
};

export type PoFormDraft = {
  po_no: string;
  contract_no: string;
  supplier_id: string;
  currency_id: string;
  incoterm_id: string;
  transport_mode_id: string;
  po_type: string;
  payment_term: string;
  exchange_rate: number;
  expected_etd: string;
  expected_eta: string;
  origin_port: string;
  destination_port: string;
  notes: string;
  // Reversed flow: a PO is created from a CONFIRMED quotation (required in create mode).
  quotation_id: string;
  lines: PoLineDraft[];
};

export type QuotationPrefillMasterData = {
  currencies: Currency[];
  incoterms: Incoterm[];
  transportModes: TransportMode[];
};

type QuotationPrefillSource = Pick<
  QuotationV1,
  'currency_code' | 'exchange_rate' | 'id' | 'incoterm_code' | 'mode'
> & Partial<Pick<QuotationV1, 'supplier_id'>>;

export type LotDraft = {
  id?: string;
  lot_no: string;
  lot_name: string;
  status: PoLotStatus;
  planned_cargo_ready_date: string;
  planned_etd: string;
  planned_eta: string;
  origin_port: string;
  destination_port: string;
  sort_order: number;
  notes: string;
};

export type SplitDraft = {
  sourceLot: PoLot;
  sourceLine: PoLotLine;
  target_lot_id: string;
  split_qty: number;
};

export function dateOnly(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '';
}

export function nullIfEmpty(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Derives the contract number from the PO number (PO no is the source of truth).
// Swaps a leading "PO" token (case-insensitive, optional - _ or space separator)
// for the contract prefix, preserving the rest. Blank input yields "".
export function deriveContractNo(poNo: string, prefix = 'CT'): string {
  const core = poNo.trim().replace(/^PO[-_\s]?/i, '');
  return core ? `${prefix}-${core}` : '';
}

export function toNumber(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

export function newLineDraft(index: number): PoLineDraft {
  return {
    clientId: `line-${Date.now()}-${index}`,
    line_no: index + 1,
    item_id: '',
    item_customs_profile_id: '',
    item_description: '',
    qty_ordered: 1,
    unit: 'PCS',
    unit_price: 0,
    tax_rate: 0,
    discount_pct: 0,
    gross_weight_kg: 0,
    expected_eta_line: '',
    notes: '',
  };
}

export function createInitialPoDraft(order?: PurchaseOrderV1): PoFormDraft {
  const poNo = order?.po_no ?? `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  return {
    po_no: poNo,
    contract_no: order?.contract_no ?? deriveContractNo(poNo),
    supplier_id: order?.supplier_id ?? '',
    currency_id: order?.currency_id ?? '',
    incoterm_id: order?.incoterm_id ?? '',
    transport_mode_id: order?.transport_mode_id ?? '',
    po_type: order?.po_type ?? '',
    payment_term: order?.payment_term ?? '',
    exchange_rate: toNumber(order?.exchange_rate, 1) || 1,
    expected_etd: dateOnly(order?.expected_etd),
    expected_eta: dateOnly(order?.expected_eta),
    origin_port: order?.origin_port ?? '',
    destination_port: order?.destination_port ?? '',
    notes: order?.notes ?? '',
    quotation_id: order?.quotation_id ?? '',
    lines: order?.lines?.length
      ? order.lines.map((line, index) => ({
        clientId: line.id,
        line_no: line.line_no,
        item_id: line.item_id,
        item_customs_profile_id: line.item_customs_profile_id ?? '',
        item_description: line.item_description ?? '',
        qty_ordered: toNumber(line.qty_ordered, 1),
        unit: line.unit ?? 'PCS',
        unit_price: toNumber(line.unit_price),
        tax_rate: toNumber(line.tax_rate),
        discount_pct: toNumber(line.discount_pct),
        gross_weight_kg: toNumber(line.gross_weight_kg),
        expected_eta_line: dateOnly(line.expected_eta_line),
        notes: line.notes ?? '',
      }))
      : [newLineDraft(0)],
  };
}

export function applyQuotationPrefill(
  draft: PoFormDraft,
  quotation: QuotationPrefillSource,
  masterData: QuotationPrefillMasterData,
): PoFormDraft {
  const incoterm = masterData.incoterms.find((item) => item.incoterm_code === quotation.incoterm_code);
  const currency = masterData.currencies.find((item) => item.currency_code === quotation.currency_code);
  const exchangeRate = toNumber(quotation.exchange_rate);

  const nextDraft = {
    ...draft,
    quotation_id: quotation.id,
    supplier_id: quotation.supplier_id || draft.supplier_id,
    incoterm_id: incoterm?.id ?? draft.incoterm_id,
    currency_id: currency?.id ?? draft.currency_id,
    transport_mode_id: resolveQuotationTransportModeId(quotation.mode, masterData.transportModes) ?? draft.transport_mode_id,
    exchange_rate: exchangeRate > 0 ? exchangeRate : draft.exchange_rate,
  };

  return draft.quotation_id === nextDraft.quotation_id &&
    draft.supplier_id === nextDraft.supplier_id &&
    draft.incoterm_id === nextDraft.incoterm_id &&
    draft.currency_id === nextDraft.currency_id &&
    draft.transport_mode_id === nextDraft.transport_mode_id &&
    draft.exchange_rate === nextDraft.exchange_rate
    ? draft
    : nextDraft;
}

export function applyRfqLinesPrefill(
  draft: PoFormDraft,
  rfqLines: QuotationRequestLineV1[],
): PoFormDraft {
  if (rfqLines.length === 0) {
    return draft;
  }

  return {
    ...draft,
    lines: rfqLines.map((line, index) => ({
      ...newLineDraft(index),
      item_id: line.item_id ?? '',
      item_description: line.item_description ?? line.item?.item_name_en ?? line.item?.item_name ?? '',
      qty_ordered: toNumber(line.qty, 1),
      unit: line.unit ?? line.item?.base_uom ?? 'PCS',
      unit_price: toNumber(line.unit_price),
      gross_weight_kg: toNumber(line.gross_weight_kg),
      notes: line.note ?? '',
    })),
  };
}

function resolveQuotationTransportModeId(mode: string | null | undefined, transportModes: TransportMode[]) {
  const normalizedMode = String(mode ?? '').toUpperCase();
  if (!normalizedMode.includes('AIR') && !normalizedMode.includes('FCL') && !normalizedMode.includes('LCL')) {
    return null;
  }

  const shippingMode = toShippingMode(mode);
  const transportModeCode = shippingMode === 'AIR' ? 'AIR' : 'SEA';

  return transportModes.find((item) => item.mode_code.toUpperCase() === transportModeCode)?.id ?? null;
}

export function buildPoPayload(draft: PoFormDraft): CreatePurchaseOrderV1Payload {
  return {
    po_no: draft.po_no.trim(),
    supplier_id: draft.supplier_id,
    contract_no: nullIfEmpty(draft.contract_no),
    currency_id: nullIfEmpty(draft.currency_id),
    incoterm_id: nullIfEmpty(draft.incoterm_id),
    transport_mode_id: nullIfEmpty(draft.transport_mode_id),
    po_type: nullIfEmpty(draft.po_type) as PurchaseOrderTypeV1 | null,
    payment_term: nullIfEmpty(draft.payment_term),
    exchange_rate: draft.exchange_rate || 1,
    expected_etd: nullIfEmpty(draft.expected_etd),
    expected_eta: nullIfEmpty(draft.expected_eta),
    origin_port: nullIfEmpty(draft.origin_port),
    destination_port: nullIfEmpty(draft.destination_port),
    notes: nullIfEmpty(draft.notes),
    quotation_id: nullIfEmpty(draft.quotation_id),
    lines: draft.lines
      .filter((line) => line.item_id && Number(line.qty_ordered) > 0)
      .map<PurchaseOrderLinePayload>((line, index) => ({
        line_no: line.line_no || index + 1,
        item_id: line.item_id,
        item_customs_profile_id: nullIfEmpty(line.item_customs_profile_id),
        item_description: nullIfEmpty(line.item_description),
        qty_ordered: Number(line.qty_ordered),
        unit: nullIfEmpty(line.unit),
        unit_price: Number(line.unit_price) || 0,
        tax_rate: Number(line.tax_rate) || 0,
        discount_pct: Number(line.discount_pct) || 0,
        gross_weight_kg: Number(line.gross_weight_kg) || 0,
        expected_eta_line: nullIfEmpty(line.expected_eta_line),
        notes: nullIfEmpty(line.notes),
      })),
  };
}

export function resolvePoOriginCountry(order: Pick<PurchaseOrderV1, 'supplier'>) {
  return order.supplier?.country ?? null;
}

export function resolveCreateDoFromLotsDefaults(
  lots: PoLot[],
  purchaseOrder: Pick<PurchaseOrderV1, 'destination_port' | 'expected_eta' | 'expected_etd' | 'origin_port'>,
) {
  const primaryLot = lots[0];

  return {
    origin_port: primaryLot?.origin_port || purchaseOrder.origin_port || '',
    destination_port: primaryLot?.destination_port || purchaseOrder.destination_port || '',
    requested_pickup_date: dateOnly(primaryLot?.planned_cargo_ready_date),
    planned_etd: dateOnly(primaryLot?.planned_etd ?? purchaseOrder.expected_etd),
    planned_eta: dateOnly(primaryLot?.planned_eta ?? purchaseOrder.expected_eta),
  };
}

export function buildPoPatchPayload(draft: PoFormDraft): UpdatePurchaseOrderV1Payload {
  const payload = buildPoPayload(draft);
  const { lines: _lines, ...header } = payload;
  return header;
}

export function totalPoAmount(lines: PurchaseOrderLineV1[] | PoLineDraft[] | undefined) {
  return (lines ?? []).reduce((total, line) => {
    if ('qty_ordered' in line) {
      return total + toNumber(line.qty_ordered) * toNumber(line.unit_price);
    }
    return total;
  }, 0);
}

export function buildCustomsOptions(item: Item | undefined): SelectOption[] {
  return (item?.customs_profiles ?? []).map((profile) => ({
    label: [profile.hs_code, profile.co_form, profile.customs_type].filter(Boolean).join(' / ') || profile.id,
    value: profile.id,
  }));
}

export function getPurchaseOrderSummary(purchaseOrders: PurchaseOrderV1[]) {
  return purchaseOrders.reduce(
    (summary, order) => {
      summary.totalWeightKg += toNumber(order.lot_summary?.total_weight_kg ?? order.total_weight_kg);
      summary.totalContainers += toNumber(order.lot_summary?.total_containers ?? order.total_containers);
      summary.totalLots += toNumber(order.lot_summary?.total_lots ?? order.total_lots);
      return summary;
    },
    { totalWeightKg: 0, totalContainers: 0, totalLots: 0 },
  );
}

// Display-only aggregation of per-line fulfillment quantities for the PO
// execution summary. Quantities are summed as raw numbers; units may differ
// per line (SET/PCS…), so this is a signal, not an accounting total.
export function getPoFulfillment(lines: PurchaseOrderLineV1[]) {
  return (lines ?? []).reduce(
    (acc, line) => {
      acc.ordered += toNumber(line.qty_ordered);
      acc.confirmed += toNumber(line.qty_confirmed);
      acc.lotted += toNumber(line.qty_lotted);
      acc.shipped += toNumber(line.qty_shipped);
      acc.received += toNumber(line.qty_received);
      acc.totalLines += 1;
      if (getPoLineLotState(line) === 'full') acc.lottedLines += 1;
      return acc;
    },
    { ordered: 0, confirmed: 0, lotted: 0, shipped: 0, received: 0, lottedLines: 0, totalLines: 0 },
  );
}

export function getPoLineLotState(line: PurchaseOrderLineV1) {
  const lottedQty = toNumber(line.qty_lotted);
  const targetQty = toNumber(line.qty_confirmed) || toNumber(line.qty_ordered);
  if (targetQty <= 0 && lottedQty <= 0) return 'none';
  if (lottedQty <= 0) return 'needs-lot';
  if (lottedQty >= targetQty) return 'full';
  return 'partial';
}

export type PoLineReceiptState = 'none' | 'full' | 'short' | 'pending';

// Received vs Shipped reconciliation at the PO line (procurement view).
// Shipped means assigned to an international shipment; Received means fully
// received against Shipped quantity.
// Warehouse-delivery completeness (DTO/container) is intentionally out of scope here.
export function getPoLineReceiptState(line: PurchaseOrderLineV1): { state: PoLineReceiptState; shortfall: number } {
  const shipped = toNumber(line.qty_shipped);
  const received = toNumber(line.qty_received);
  if (shipped <= 0) return { state: 'none', shortfall: 0 };
  if (received >= shipped) return { state: 'full', shortfall: 0 };
  if (received <= 0) return { state: 'pending', shortfall: shipped };
  return { state: 'short', shortfall: shipped - received };
}

export function getDelayedDays(order: PurchaseOrderV1) {
  return toNumber(order.delayed_days);
}

export function resolvePoStage(po: PurchaseOrderV1): { stageKey: PoStageKey; statusCode: string } {
  // An explicit lifecycle status wins over the timeline derivation. This is the
  // single hook for real data: when the backend computes the laggard shipment
  // status it sets `lifecycle_status`, and the UI keeps reading it here unchanged.
  // TODO(real-data): feed `lifecycle_status` from the laggard shipment.status and
  // expand to a breakdown[] for multi-shipment POs (HoverCard in PoStageBadge).
  const statusCode = po.lifecycle_status?.trim() ? po.lifecycle_status : deriveMockPoStatusCode(po);
  return selectLaggardStage([statusCode], po.status);
}

function deriveMockPoStatusCode(po: PurchaseOrderV1): string {
  if (po.status === 'CANCELLED') return 'CANCELLED';
  if (dateOnly(po.logistics_timeline?.warehouse?.ata ?? po.actual_warehouse_ata)) return 'DELIVERED';
  if (dateOnly(po.logistics_timeline?.unloading_port?.ata ?? po.actual_eta)) return 'ARRIVED';
  if (dateOnly(po.logistics_timeline?.loading_port?.atd ?? po.actual_etd)) return 'IN_TRANSIT';
  return po.status;
}

function selectLaggardStage(
  statusCodes: string[],
  fallbackPoStatus: PurchaseOrderStatusV1,
): { stageKey: PoStageKey; statusCode: string } {
  return statusCodes
    .map((statusCode) => ({
      stageKey: STAGE_BY_STATUS[statusCode] ?? STAGE_BY_STATUS[fallbackPoStatus],
      statusCode,
    }))
    .sort((left, right) => stageOrder(left.stageKey) - stageOrder(right.stageKey))[0];
}

export function getDateDelayDays(planned: string | null | undefined, actual: string | null | undefined) {
  if (!planned || !actual) return null;
  const plannedDate = new Date(planned);
  const actualDate = new Date(actual);
  if (Number.isNaN(plannedDate.getTime()) || Number.isNaN(actualDate.getTime())) return null;
  const diffDays = Math.ceil((actualDate.getTime() - plannedDate.getTime()) / 86_400_000);
  return Math.max(diffDays, 0);
}

export function formatWeightKg(value: number) {
  if (!value) return '';
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`;
}
