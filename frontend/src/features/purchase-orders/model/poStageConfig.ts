import type { PurchaseOrderStatusV1 } from '@shared/api/purchaseOrders';
import type { ShipmentStatusV1 } from '@shared/api/shipments';

export const PO_STAGES = [
  {
    key: 'PROCUREMENT',
    labelKey: 'PROCUREMENT',
    members: ['DRAFT', 'SENT', 'CONFIRMED'],
  },
  {
    key: 'PRODUCTION',
    labelKey: 'PRODUCTION',
    members: ['IN_PRODUCTION', 'READY_TO_SHIP', 'CARGO_READY'],
  },
  {
    key: 'IN_TRANSIT',
    labelKey: 'IN_TRANSIT',
    members: ['PICKED_UP', 'BL_ISSUED', 'GATE_IN_POL', 'IN_TRANSIT', 'ARRIVED'],
  },
  {
    key: 'CUSTOMS',
    labelKey: 'CUSTOMS',
    members: ['CUSTOMS_DRAFT', 'CUSTOMS_CLEARED'],
  },
  {
    key: 'DELIVERED',
    labelKey: 'DELIVERED',
    members: ['DELIVERED'],
  },
  {
    key: 'CANCELLED',
    labelKey: 'CANCELLED',
    members: ['CANCELLED'],
  },
] as const satisfies ReadonlyArray<{
  key: string;
  labelKey: string;
  members: readonly string[];
}>;

export type PoStageKey = (typeof PO_STAGES)[number]['key'];
export type PoStageStatusCode = (typeof PO_STAGES)[number]['members'][number];
export type PoStageFilterValue = `stage:${PoStageKey}`;
export type PoStageChildStatus = PoStageStatusCode | ShipmentStatusV1;

export type PoClientStageFilter =
  | { kind: 'stage'; stageKey: PoStageKey }
  | { kind: 'status'; statusCode: string };

export type PoStatusFilterRoute = {
  apiStatus?: PurchaseOrderStatusV1;
  clientStageFilter?: PoClientStageFilter;
};

const PO_API_STATUSES = [
  'DRAFT',
  'SENT',
  'CONFIRMED',
  'IN_PRODUCTION',
  'READY_TO_SHIP',
  'CANCELLED',
] as const satisfies readonly PurchaseOrderStatusV1[];

const PO_STAGE_KEYS = PO_STAGES.map((stage) => stage.key);

export const STAGE_BY_STATUS = PO_STAGES.reduce<Record<string, PoStageKey>>((index, stage) => {
  stage.members.forEach((status) => {
    index[status] = stage.key;
  });
  return index;
}, {});

export function stageOrder(stageKey: PoStageKey): number {
  const index = PO_STAGES.findIndex((stage) => stage.key === stageKey);
  return index >= 0 ? index : PO_STAGES.length;
}

export function isPurchaseOrderApiStatus(value: string): value is PurchaseOrderStatusV1 {
  return PO_API_STATUSES.includes(value as PurchaseOrderStatusV1);
}

export function isPoStageKey(value: string): value is PoStageKey {
  return PO_STAGE_KEYS.includes(value as PoStageKey);
}

export function isPoStageFilterValue(value: string): value is PoStageFilterValue {
  if (!value.startsWith('stage:')) return false;
  return isPoStageKey(value.replace(/^stage:/, ''));
}

export function mapStatusFilterToApi(value: string): PoStatusFilterRoute {
  if (!value || value === 'all') return {};
  if (isPoStageFilterValue(value)) {
    return { clientStageFilter: { kind: 'stage', stageKey: value.replace(/^stage:/, '') as PoStageKey } };
  }
  // Sub-status chips (including the real PO statuses) are filtered client-side
  // against the lifecycle-driven stage, so the chip selection always matches the
  // badge shown in the table. The server `status` column can diverge from the
  // resolved lifecycle status (e.g. a READY_TO_SHIP PO whose cargo is IN_TRANSIT).
  // TODO(real-data): when the backend accepts stage/lifecycle filters, route here.
  return { clientStageFilter: { kind: 'status', statusCode: value } };
}
