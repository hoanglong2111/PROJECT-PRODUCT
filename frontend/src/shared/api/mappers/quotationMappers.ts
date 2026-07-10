import { QuotationChargeLineV1, QuotationChargeTypeV1, QuotationStatusV1, QuotationTypeV1, QuotationV1 } from '../quotations';
import { Quotation, QuotationStatus, ShippingMode } from '@shared/model/logistics';
import { addDaysIso, sumNumbers, toNumber, uiId } from './mapperShared';

export type CreateQuotationPayload = {
  requestCode: string;
  shippingMode: ShippingMode;
  quoteAmount?: number | null;
  currency?: string | null;
  /**
   * Itemized Incoterms-aware charge lines. When provided, these are persisted
   * verbatim and the legacy flat freight/local/customs fields are ignored.
   */
  chargeLines?: QuotationChargeLineInput[];
};

export type QuotationChargeLineInput = {
  charge_type: string;
  description: string;
  unit?: string;
  quantity?: number;
  unit_price: number;
};

export function quotationStatusToUi(status: QuotationStatusV1): QuotationStatus {
  const statusMap: Record<QuotationStatusV1, QuotationStatus> = {
    DRAFT: 'DRAFT',
    PENDING_APPROVAL: 'OFFICIAL_SENT',
    PENDING_ADJUSTMENT: 'OFFICIAL_SENT',
    CONFIRMED: 'APPROVED',
    REJECTED: 'REJECTED',
  };

  return statusMap[status];
}

export function inferQuotationShippingMode(quotation: QuotationV1): ShippingMode {
  const lines = quotation.charge_lines ?? [];
  const chargeTypes = new Set(lines.map((line) => line.charge_type));
  if (chargeTypes.has('AIR_FREIGHT')) return 'AIR';
  // Fall back to the per-line pricing basis (CONT/RT/KGS) emitted by the
  // Incoterms-aware form, since the quotation record has no shipping-mode field.
  const units = new Set(lines.map((line) => (line.unit ?? '').toUpperCase()));
  if (units.has('KGS')) return 'AIR';
  if (units.has('RT') || chargeTypes.has('CFS')) return 'LCL';
  if (units.has('CONT')) return 'FCL';
  if (chargeTypes.has('TRUCKING')) return 'LCL';
  return 'FCL';
}

export function sumChargeLines(chargeLines: QuotationChargeLineV1[] | undefined, types: string[]) {
  const allowedTypes = new Set(types);
  return sumNumbers(
    (chargeLines ?? [])
      .filter((line) => allowedTypes.has(line.charge_type))
      .map((line) => line.total_amount ?? line.amount),
  );
}

export function mapV1Quotation(quotation: QuotationV1, requestCode?: string): Quotation & {
  carrierName?: string;
  chargeLines?: QuotationChargeLineV1[];
  customsFee?: number;
  freightCost?: number;
  isFinal?: boolean;
  isAllInclusive?: boolean;
  localCharges?: number;
  quotationGroupId?: string;
  version?: number;
} {
  const chargeLines = quotation.charge_lines ?? [];
  const freightCost = sumChargeLines(chargeLines, ['OCEAN_FREIGHT', 'AIR_FREIGHT', 'BREAKBULK_FREIGHT', 'ORIGIN_CHARGE']);
  const localCharges = sumChargeLines(chargeLines, [
    'LOCAL_CHARGE', 'TRUCKING', 'DO_FEE', 'HANDLING', 'THC', 'CIC', 'EMC_EMF', 'CLEANING', 'CFS',
    'LOWERING_FEE', 'LOADING_FEE', 'DEMURRAGE', 'DETENTION', 'WAREHOUSE', 'DOCUMENT_FEE',
  ]);
  const customsFee = sumChargeLines(chargeLines, ['CUSTOMS_FEE']);
  const quotationTotal = Number(quotation.grand_total_amount ?? quotation.total_amount);
  const chargeLineTotal = sumNumbers(chargeLines.map((line) => line.total_amount ?? line.amount));

  return {
    autoApproveAt: null,
    bookingConfirmedAt: quotation.confirmed_at,
    bookingNumber: quotation.is_final ? quotation.quotation_no : null,
    carrierName: quotation.supplier?.supplier_name ?? quotation.supplier_id,
    chargeLines,
    createdAt: quotation.create_at,
    createdBy: null,
    currency: quotation.currency?.currency_code ?? quotation.currency_code ?? quotation.currency_id ?? null,
    customerResponseAt: quotation.confirmed_at ?? quotation.rejected_at ?? quotation.cancelled_at,
    customsFee,
    freightCost,
    id: quotation.id,
    isFinal: quotation.is_final,
    isAllInclusive: quotation.quotation_type === 'MIXED',
    localCharges,
    officialDueAt: quotation.valid_until ?? addDaysIso(3),
    officialSentAt: quotation.submitted_at,
    preliminaryDueAt: quotation.quoted_at ?? addDaysIso(1),
    preliminarySentAt: quotation.quoted_at,
    quoteAmount: Number.isFinite(quotationTotal) ? quotationTotal : chargeLineTotal,
    quoteNumber: quotation.version > 1 ? `${quotation.quotation_no} v${quotation.version}` : quotation.quotation_no,
    quotationGroupId: quotation.quotation_group_id,
    requestCode: requestCode ?? quotation.ref_id ?? '',
    shippingMode: inferQuotationShippingMode(quotation),
    status: quotationStatusToUi(quotation.status),
    updatedAt: quotation.update_at,
    version: quotation.version,
  };
}

export type BuiltQuotationChargeLine = {
  charge_type: QuotationChargeTypeV1;
  description: string;
  line_no: number;
  quantity: number;
  unit: string;
  unit_price: number;
};

export function buildQuotationChargeLines(payload: CreateQuotationPayload): BuiltQuotationChargeLine[] {
  // Preferred path: itemized Incoterms-aware lines from the form.
  if (Array.isArray(payload.chargeLines) && payload.chargeLines.length > 0) {
    return payload.chargeLines
      .filter((line) => toNumber(line.unit_price) > 0)
      .map((line, index) => ({
        charge_type: line.charge_type as QuotationChargeTypeV1,
        description: line.description,
        line_no: index + 1,
        quantity: toNumber(line.quantity) || 1,
        unit: line.unit || 'SET',
        unit_price: toNumber(line.unit_price),
      }));
  }

  // Legacy fallback: flat freight/local/customs aggregate fields.
  const shippingMode = payload.shippingMode.toUpperCase();
  const chargeLines: BuiltQuotationChargeLine[] = [];
  const addLine = (chargeType: QuotationChargeTypeV1, description: string, amount: number) => {
    if (amount <= 0) return;
    chargeLines.push({
      charge_type: chargeType,
      description,
      line_no: chargeLines.length + 1,
      quantity: 1,
      unit: 'SET',
      unit_price: amount,
    });
  };
  const mainFreight = toNumber((payload as any).freightCost) || toNumber(payload.quoteAmount);

  addLine(shippingMode.includes('AIR') ? 'AIR_FREIGHT' : 'OCEAN_FREIGHT', 'Main freight', mainFreight);
  addLine('LOCAL_CHARGE', 'Local charges', toNumber((payload as any).localCharges));
  addLine('CUSTOMS_FEE', 'Customs clearance fee', toNumber((payload as any).customsFee));

  return chargeLines;
}

export function inferQuotationTypeFromChargeLines(chargeLines: ReturnType<typeof buildQuotationChargeLines>): QuotationTypeV1 {
  const types = new Set(chargeLines.map((line) => line.charge_type));
  if (types.size > 1) return 'MIXED';
  if (types.has('CUSTOMS_FEE')) return 'CUSTOMS';
  if (types.has('LOCAL_CHARGE')) return 'LOCAL_CHARGE';
  return 'FREIGHT';
}

export function buildUiQuotation(payload: CreateQuotationPayload): Quotation {
  const now = new Date().toISOString();

  return {
    id: uiId('quote'),
    quoteNumber: payload.requestCode || uiId('QUOTE'),
    requestCode: payload.requestCode,
    shippingMode: payload.shippingMode,
    status: 'DRAFT',
    preliminaryDueAt: now,
    preliminarySentAt: null,
    officialDueAt: now,
    officialSentAt: null,
    autoApproveAt: null,
    customerResponseAt: null,
    quoteAmount: payload.quoteAmount ?? null,
    currency: payload.currency ?? null,
    bookingNumber: null,
    bookingConfirmedAt: null,
    createdBy: null,
    createdAt: now,
    updatedAt: now,
  };
}
