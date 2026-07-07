import type { QuotationRequestLineV1, QuotationRequestStatusV1 } from '@shared/api/quotationRequests';
import type { MessageKey } from '@shared/i18n';

export type QuotationRequestTab = 'all' | 'submitted' | 'received' | 'quoted' | 'confirmed' | 'cancelled';

export const quotationRequestStatusTabs: Record<Exclude<QuotationRequestTab, 'all'>, QuotationRequestStatusV1[]> = {
  submitted: ['SUBMITTED'],
  received: ['RECEIVED'],
  quoted: ['QUOTED'],
  confirmed: ['CONFIRMED'],
  cancelled: ['CANCELLED'],
};

export const quotationRequestTabItems: { value: QuotationRequestTab; labelKey: MessageKey }[] = [
  { value: 'all', labelKey: 'quotationRequests.tabAll' },
  { value: 'submitted', labelKey: 'quotationRequests.tabSubmitted' },
  { value: 'received', labelKey: 'quotationRequests.tabReceived' },
  { value: 'quoted', labelKey: 'quotationRequests.tabQuoted' },
  { value: 'confirmed', labelKey: 'quotationRequests.tabConfirmed' },
  { value: 'cancelled', labelKey: 'quotationRequests.tabCancelled' },
];

export function rfqStatusColor(status: QuotationRequestStatusV1): string {
  switch (status) {
    case 'SUBMITTED':
      return 'blue';
    case 'RECEIVED':
      return 'cyan';
    case 'QUOTED':
      return 'orange';
    case 'CONFIRMED':
      return 'green';
    case 'CANCELLED':
      return 'gray';
    default:
      return 'gray';
  }
}

export const rfqModeOptions = [
  { value: 'SEA_FCL', label: 'SEA FCL' },
  { value: 'SEA_LCL', label: 'SEA LCL' },
  { value: 'AIR', label: 'AIR' },
];

type RfqDimensionLine = {
  height_cm?: number | string | null;
  length_cm?: number | string | null;
  qty?: number | string | null;
  width_cm?: number | string | null;
};

export function rfqTotalWeight(lines: { gross_weight_kg?: QuotationRequestLineV1['gross_weight_kg'] }[] = []): number {
  return lines.reduce((total, line) => {
    const next = Number(line.gross_weight_kg ?? 0);
    return Number.isFinite(next) ? total + next : total;
  }, 0);
}

export function isAirMode(mode?: string | null): boolean {
  return (mode ?? '').toUpperCase() === 'AIR';
}

export function rfqDimWeightKg(volumeCbm: number | string | null | undefined): number {
  const cbm = Number(volumeCbm ?? 0);
  if (!Number.isFinite(cbm) || cbm <= 0) return 0;
  return (cbm * 1_000_000) / 6000;
}

export function rfqChargeableWeightKg(
  grossKg: number | string | null | undefined,
  dimKg: number | string | null | undefined,
): number {
  const gross = Number(grossKg ?? 0);
  const dim = Number(dimKg ?? 0);
  return Math.max(Number.isFinite(gross) ? gross : 0, Number.isFinite(dim) ? dim : 0);
}

export function rfqLineCbm(line: RfqDimensionLine): number {
  const qty = Number(line.qty ?? 0);
  const length = Number(line.length_cm ?? 0);
  const width = Number(line.width_cm ?? 0);
  const height = Number(line.height_cm ?? 0);
  if ([qty, length, width, height].some((value) => !Number.isFinite(value) || value <= 0)) return 0;
  return (qty * length * width * height) / 1_000_000;
}

export function rfqTotalCbm(lines: RfqDimensionLine[] = []): number {
  return lines.reduce((total, line) => total + rfqLineCbm(line), 0);
}

export const rfqPackageTypes = ['CARTON', 'PALLET', 'CRATE', 'DRUM', 'BAG', 'ROLL'] as const;
export type RfqPackageType = (typeof rfqPackageTypes)[number];

export type RfqPackageSizePreset = {
  value: string;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  types?: RfqPackageType[];
};

export const RFQ_PACKAGE_CUSTOM_PRESET = 'CUSTOM';

export const rfqPackageSizePresets: RfqPackageSizePreset[] = [
  { value: 'PALLET_STD', length_cm: 120, width_cm: 100, height_cm: 150, types: ['PALLET'] },
  { value: 'PALLET_EUR', length_cm: 120, width_cm: 80, height_cm: 150, types: ['PALLET'] },
  { value: 'PALLET_LOW', length_cm: 120, width_cm: 100, height_cm: 100, types: ['PALLET'] },
  { value: 'CARTON_S', length_cm: 40, width_cm: 30, height_cm: 30, types: ['CARTON'] },
  { value: 'CARTON_M', length_cm: 60, width_cm: 40, height_cm: 40, types: ['CARTON'] },
  { value: 'CARTON_L', length_cm: 60, width_cm: 50, height_cm: 50, types: ['CARTON'] },
];

export function rfqPackageSizePreset(value: string): RfqPackageSizePreset | undefined {
  return rfqPackageSizePresets.find((preset) => preset.value === value);
}

export type RfqPackageDraft = {
  clientId: string;
  package_no: number;
  package_type: RfqPackageType;
  size_preset: string;
  length_cm: number | '';
  width_cm: number | '';
  height_cm: number | '';
  qty: number | '';
  gross_weight_per_package_kg: number | '';
  item_id: string;
  item_description: string;
  unit: string;
  unit_price: number | '';
  note: string;
};

let rfqPackageClientIdSeq = 0;
export function newRfqPackage(index: number, defaults?: Partial<RfqPackageDraft>): RfqPackageDraft {
  rfqPackageClientIdSeq += 1;
  return {
    clientId: `pkg-${Date.now()}-${rfqPackageClientIdSeq}`,
    package_no: index + 1,
    package_type: 'CARTON',
    size_preset: RFQ_PACKAGE_CUSTOM_PRESET,
    length_cm: '',
    width_cm: '',
    height_cm: '',
    qty: 1,
    gross_weight_per_package_kg: '',
    item_id: '',
    item_description: '',
    unit: '',
    unit_price: '',
    note: '',
    ...defaults,
  };
}

export function rfqPackageAmount(pkg: { qty?: number | string | null; unit_price?: number | string | null }): number {
  const qty = Number(pkg.qty ?? 0);
  const unitPrice = Number(pkg.unit_price ?? 0);
  if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) return 0;
  return qty * unitPrice;
}

export function rfqPackageCbm(pkg: {
  qty?: number | string | null;
  length_cm?: number | string | null;
  width_cm?: number | string | null;
  height_cm?: number | string | null;
}): number {
  const qty = Number(pkg.qty ?? 0);
  const length = Number(pkg.length_cm ?? 0);
  const width = Number(pkg.width_cm ?? 0);
  const height = Number(pkg.height_cm ?? 0);
  if ([qty, length, width, height].some((value) => !Number.isFinite(value) || value <= 0)) return 0;
  return (qty * length * width * height) / 1_000_000;
}

export type RfqPackagesTotals = {
  totalCbm: number;
  grossKg: number;
};

export function rfqPackagesTotals(
  pkgs: {
    qty?: number | string | null;
    length_cm?: number | string | null;
    width_cm?: number | string | null;
    height_cm?: number | string | null;
    gross_weight_per_package_kg?: number | string | null;
  }[] = [],
): RfqPackagesTotals {
  const totalCbm = pkgs.reduce((total, pkg) => total + rfqPackageCbm(pkg), 0);
  const grossKg = pkgs.reduce((total, pkg) => {
    const qty = Number(pkg.qty ?? 0);
    const grossPerPkg = Number(pkg.gross_weight_per_package_kg ?? 0);
    if (!Number.isFinite(qty) || !Number.isFinite(grossPerPkg)) return total;
    return total + qty * grossPerPkg;
  }, 0);
  return { totalCbm, grossKg };
}

/**
 * SEA LCL "W/M" (weight-or-measurement) revenue ton, per the industry rule KBFE follows:
 * 1 CBM ≡ 1 RT and 1000 kg ≡ 1 RT — chargeable RT is whichever is larger. This is distinct
 * from the AIR volumetric divisor (rfqDimWeightKg/rfqChargeableWeightKg, ÷6000, kg-based).
 */
export function rfqLclChargeableRevenueTon(
  totalCbm: number | string | null | undefined,
  grossKg: number | string | null | undefined,
): number {
  const cbm = Number(totalCbm ?? 0);
  const grossTon = Number(grossKg ?? 0) / 1000;
  return Math.max(Number.isFinite(cbm) ? cbm : 0, Number.isFinite(grossTon) ? grossTon : 0);
}

export type RfqContainerLineDraft = {
  clientId: string;
  item_id: string;
  item_description: string;
  qty: number | '';
  unit: string;
  unit_price: number | '';
  gross_weight_kg: number | '';
  note: string;
};

let rfqContainerLineClientIdSeq = 0;
export function newRfqContainerLine(defaults?: Partial<RfqContainerLineDraft>): RfqContainerLineDraft {
  rfqContainerLineClientIdSeq += 1;
  return {
    clientId: `cntl-${Date.now()}-${rfqContainerLineClientIdSeq}`,
    item_id: '',
    item_description: '',
    qty: 1,
    unit: '',
    unit_price: '',
    gross_weight_kg: '',
    note: '',
    ...defaults,
  };
}

export function rfqContainerLineAmount(line: { qty?: number | string | null; unit_price?: number | string | null }): number {
  const qty = Number(line.qty ?? 0);
  const unitPrice = Number(line.unit_price ?? 0);
  if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) return 0;
  return qty * unitPrice;
}

export function rfqContainersTotalWeight(containers: { lines: { gross_weight_kg?: number | string | null }[] }[] = []): number {
  return containers.reduce(
    (total, container) => total + container.lines.reduce((lineTotal, line) => {
      const weight = Number(line.gross_weight_kg ?? 0);
      return Number.isFinite(weight) ? lineTotal + weight : lineTotal;
    }, 0),
    0,
  );
}

export type RfqContainerDraft = {
  clientId: string;
  container_type: string;
  qty: number | '';
  lines: RfqContainerLineDraft[];
};

let rfqContainerClientIdSeq = 0;
export function newRfqContainer(defaults?: Partial<RfqContainerDraft>): RfqContainerDraft {
  rfqContainerClientIdSeq += 1;
  return {
    clientId: `cnt-${Date.now()}-${rfqContainerClientIdSeq}`,
    container_type: '',
    qty: 1,
    lines: [newRfqContainerLine()],
    ...defaults,
  };
}
