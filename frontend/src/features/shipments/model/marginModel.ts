import type { QuotationChargeLineV1, QuotationV1 } from '@shared/api/quotations';
import type { Gd1CostType, ShipmentCost } from '@shared/model/logistics';
import { convertToBase, sumMoney } from '@shared/utils/money';

import { quotationDisplayTotal } from '@features/quotations/model/quotationModel';

import { landedCostTotal } from './shipmentModel';

const BASE_CURRENCY = 'VND';

export type ShipmentMarginRow = {
  bucket: Gd1CostType;
  quotedVnd: number;
  actualVnd: number;
  marginVnd: number;
};

export type ShipmentMarginSummary = {
  rows: ShipmentMarginRow[];
  totals: {
    quotedVnd: number;
    actualVnd: number;
    marginVnd: number;
  };
};

type QuotationForMargin = Pick<
  QuotationV1,
  'charge_lines' | 'exchange_rate' | 'grand_total_amount' | 'total_amount'
>;

export type ShipmentMarginSource = {
  costs?: ShipmentCost[];
  final_quotation?: QuotationForMargin | null;
};

const COST_BUCKET_ORDER: Gd1CostType[] = [
  'FREIGHT',
  'INSURANCE',
  'CUSTOMS_DUTY',
  'VAT',
  'LOCAL_CHARGES',
  'DEMURRAGE',
  'OTHER',
];

// All main-carriage freight variants roll up to the actual side's FREIGHT bucket.
const FREIGHT_CHARGE_TYPES = new Set(['OCEAN_FREIGHT', 'AIR_FREIGHT', 'BREAKBULK_FREIGHT']);
// Detention shares the container-time family with demurrage; the actual side (Gd1CostType)
// only exposes DEMURRAGE, so quoted detention must land in the same bucket to compare.
const CONTAINER_TIME_CHARGE_TYPES = new Set(['DEMURRAGE', 'DETENTION']);
// Every origin/destination local & handling fee maps to the actual side's LOCAL_CHARGES
// bucket, so quoted vs actual local charges compare in one row instead of scattering into
// OTHER (the actual side has no dedicated bucket for any of these individually).
const LOCAL_CHARGE_TYPES = new Set([
  'ORIGIN_CHARGE',
  'LOCAL_CHARGE',
  'DOCUMENT_FEE',
  'DO_FEE',
  'HANDLING',
  'THC',
  'CIC',
  'EMC_EMF',
  'CLEANING',
  'CFS',
  'LOWERING_FEE',
  'LOADING_FEE',
  'WAREHOUSE',
]);

export function chargeTypeToCostBucket(chargeType: string | null | undefined): Gd1CostType {
  const normalized = String(chargeType ?? '').toUpperCase();

  if (FREIGHT_CHARGE_TYPES.has(normalized)) return 'FREIGHT';
  if (CONTAINER_TIME_CHARGE_TYPES.has(normalized)) return 'DEMURRAGE';
  if (normalized === 'CUSTOMS_FEE') return 'CUSTOMS_DUTY';
  if (LOCAL_CHARGE_TYPES.has(normalized)) return 'LOCAL_CHARGES';
  if (normalized.includes('INSURANCE')) return 'INSURANCE';

  return 'OTHER';
}

export function quotedTotalVnd(quotation: QuotationForMargin | null | undefined): number {
  if (!quotation) return 0;

  const lineTotals = (quotation.charge_lines ?? []).map((line) =>
    convertToBase(chargeLineTotal(line), quotation.exchange_rate, BASE_CURRENCY),
  );
  const lineTotal = sumMoney(lineTotals, BASE_CURRENCY);
  if (lineTotal > 0) return lineTotal;

  return convertToBase(quotationDisplayTotal(quotation), quotation.exchange_rate, BASE_CURRENCY);
}

export function shipmentMarginSummary(shipment: ShipmentMarginSource): ShipmentMarginSummary {
  const costs = shipment.costs ?? [];
  const quotedByBucket = new Map<Gd1CostType, number>();
  const actualByBucket = new Map<Gd1CostType, number>();
  const quotation = shipment.final_quotation ?? null;

  for (const line of quotation?.charge_lines ?? []) {
    addMoney(
      quotedByBucket,
      chargeTypeToCostBucket(line.charge_type),
      convertToBase(chargeLineTotal(line), quotation?.exchange_rate, BASE_CURRENCY),
    );
  }

  const bucketedQuotedTotal = sumMoney(Array.from(quotedByBucket.values()), BASE_CURRENCY);
  if (quotation && bucketedQuotedTotal <= 0) {
    quotedByBucket.clear();
    addMoney(quotedByBucket, 'OTHER', quotedTotalVnd(quotation));
  }

  for (const cost of costs) {
    addMoney(
      actualByBucket,
      cost.cost_type,
      convertToBase(cost.amount, cost.exchange_rate, BASE_CURRENCY),
    );
  }

  const rows = COST_BUCKET_ORDER
    .filter((bucket) => (quotedByBucket.get(bucket) ?? 0) > 0 || (actualByBucket.get(bucket) ?? 0) > 0)
    .map<ShipmentMarginRow>((bucket) => {
      const quotedVnd = quotedByBucket.get(bucket) ?? 0;
      const actualVnd = actualByBucket.get(bucket) ?? 0;

      return {
        bucket,
        quotedVnd,
        actualVnd,
        marginVnd: sumMoney([quotedVnd, -actualVnd], BASE_CURRENCY),
      };
    });

  const totals = {
    quotedVnd: sumMoney(rows.map((row) => row.quotedVnd), BASE_CURRENCY),
    actualVnd: landedCostTotal(costs),
    marginVnd: 0,
  };
  totals.marginVnd = sumMoney([totals.quotedVnd, -totals.actualVnd], BASE_CURRENCY);

  return { rows, totals };
}

function chargeLineTotal(line: QuotationChargeLineV1) {
  return line.total_amount ?? line.amount ?? 0;
}

function addMoney(target: Map<Gd1CostType, number>, bucket: Gd1CostType, amount: number) {
  target.set(bucket, sumMoney([target.get(bucket) ?? 0, amount], BASE_CURRENCY));
}
