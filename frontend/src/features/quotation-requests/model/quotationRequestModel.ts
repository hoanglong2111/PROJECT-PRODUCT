import type { QuotationRequestLineV1, QuotationRequestStatusV1, QuotationRequestV1 } from '@shared/api/quotationRequests';
import type { QuotationV1 } from '@shared/api/quotations';
import type { MessageKey } from '@shared/i18n';

export type QuotationRequestTab = 'all' | 'submitted' | 'received' | 'quoted' | 'confirmed' | 'cancelled';

/** Shared translation-function type used by the extracted RFQ panel components. */
export type TFn = (key: MessageKey | string, params?: Record<string, number | string | null | undefined>) => string;

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

export function isFclMode(mode?: string | null): boolean {
  return (mode ?? '').toUpperCase() === 'SEA_FCL';
}

/**
 * Quotations that count as a *response* to the RFQ — everything except an in-progress
 * DRAFT. REJECTED is included (it's still a delivered answer). Single source of truth
 * for the linked-quotation count shared by the list view and the detail page, which
 * previously diverged (list excluded REJECTED, detail did not).
 */
export function rfqResponseQuotations(quotations: QuotationV1[] = []): QuotationV1[] {
  return quotations.filter((quotation) => quotation.status !== 'DRAFT');
}

export function rfqHasDraftQuotation(quotations: QuotationV1[] = []): boolean {
  return quotations.some((quotation) => quotation.status === 'DRAFT');
}

export type RfqReadinessKey = 'supplier' | 'route' | 'terms' | 'readyDate' | 'cargo' | 'items';
export type RfqReadinessItem = { key: RfqReadinessKey; ok: boolean };

/**
 * Derives a "can we quote this yet?" checklist purely from data already on the RFQ —
 * no backend flag exists for readiness, so each row is inferred from the presence of
 * the fields a quoter needs. `totalWeight` is passed in so the caller reuses the same
 * value it already computed for the cargo panel.
 */
export function rfqReadiness(request: QuotationRequestV1, totalWeight: number): RfqReadinessItem[] {
  return [
    { key: 'supplier', ok: Boolean(request.supplier_id || request.supplier) },
    { key: 'route', ok: Boolean(request.origin_port && request.destination_port) },
    { key: 'terms', ok: Boolean(request.mode && request.incoterm_code) },
    { key: 'readyDate', ok: Boolean(request.desired_cargo_ready_date) },
    { key: 'cargo', ok: Boolean(totalWeight || request.volume_cbm || request.container_type) },
    { key: 'items', ok: (request.lines?.length ?? 0) > 0 },
  ];
}

export function rfqLineDimWeightKg(line: RfqDimensionLine): number {
  const qty = Number(line.qty ?? 0);
  const length = Number(line.length_cm ?? 0);
  const width = Number(line.width_cm ?? 0);
  const height = Number(line.height_cm ?? 0);
  if ([qty, length, width, height].some((value) => !Number.isFinite(value) || value <= 0)) return 0;
  return (qty * length * width * height) / 6000;
}

export function rfqPackagesDimWeightKg(
  pkgs: (RfqDimensionLine & { parent_client_id?: string })[] = [],
): number {
  const topLevelPackages = pkgs.filter((pkg) => !pkg.parent_client_id);
  return topLevelPackages.reduce((total, pkg) => total + rfqLineDimWeightKg(pkg), 0);
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

export type RfqPackageLineDraft = {
  clientId: string;
  item_id: string;
  item_description: string;
  qty: number | '';
  unit: string;
  unit_price: number | '';
  note: string;
};

let rfqPackageLineClientIdSeq = 0;
export function newRfqPackageLine(defaults?: Partial<RfqPackageLineDraft>): RfqPackageLineDraft {
  rfqPackageLineClientIdSeq += 1;
  return {
    clientId: `pkgl-${Date.now()}-${rfqPackageLineClientIdSeq}`,
    item_id: '',
    item_description: '',
    qty: 1,
    unit: '',
    unit_price: '',
    note: '',
    ...defaults,
  };
}

export function rfqPackageLineAmount(line: { qty?: number | string | null; unit_price?: number | string | null }): number {
  const qty = Number(line.qty ?? 0);
  const unitPrice = Number(line.unit_price ?? 0);
  if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) return 0;
  return qty * unitPrice;
}

export type RfqPackageDraft = {
  clientId: string;
  package_no: number;
  /** Free text (e.g. "Carton", "Pallet") — not a fixed enum, packers use their own wording. */
  package_type: string;
  length_cm: number | '';
  width_cm: number | '';
  height_cm: number | '';
  qty: number | '';
  gross_weight_per_package_kg: number | '';
  /** Item lines packed inside this physical package (e.g. several SKUs boxed into one carton). */
  lines: RfqPackageLineDraft[];
  note: string;
  /** clientId of another package this one is packed inside (e.g. a Carton loaded onto a Pallet). Empty = top-level. */
  parent_client_id: string;
};

let rfqPackageClientIdSeq = 0;
export function newRfqPackage(index: number, defaults?: Partial<RfqPackageDraft>): RfqPackageDraft {
  rfqPackageClientIdSeq += 1;
  return {
    clientId: `pkg-${Date.now()}-${rfqPackageClientIdSeq}`,
    package_no: index + 1,
    package_type: '',
    length_cm: '',
    width_cm: '',
    height_cm: '',
    qty: 1,
    gross_weight_per_package_kg: '',
    lines: [newRfqPackageLine()],
    note: '',
    parent_client_id: '',
    ...defaults,
  };
}

export function rfqPackageAmount(pkg: { lines?: { qty?: number | string | null; unit_price?: number | string | null }[] }): number {
  return (pkg.lines ?? []).reduce((total, line) => total + rfqPackageLineAmount(line), 0);
}

/** Top-level packages only (no parent) — the unit CBM/weight are declared/quoted on, to avoid double-counting nested cartons already inside a pallet. */
export function rfqTopLevelPackages<T extends { clientId: string; parent_client_id?: string }>(packages: T[]): T[] {
  return packages.filter((pkg) => !pkg.parent_client_id);
}

/** clientIds of pkg's descendants (children, grandchildren, ...), used to keep the "packed inside" picker cycle-safe. */
export function rfqPackageDescendantIds(
  packages: { clientId: string; parent_client_id?: string }[],
  clientId: string,
): Set<string> {
  const descendants = new Set<string>();
  const stack = [clientId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const pkg of packages) {
      if (pkg.parent_client_id === current && !descendants.has(pkg.clientId)) {
        descendants.add(pkg.clientId);
        stack.push(pkg.clientId);
      }
    }
  }
  return descendants;
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

export function rfqPackageOwnGrossKg(pkg: {
  qty?: number | string | null;
  gross_weight_per_package_kg?: number | string | null;
}): number {
  const qty = Number(pkg.qty ?? 0);
  const grossPerPkg = Number(pkg.gross_weight_per_package_kg ?? 0);
  if (!Number.isFinite(qty) || !Number.isFinite(grossPerPkg)) return 0;
  return qty * grossPerPkg;
}

export function rfqPackageEffectiveGrossKg(
  packages: {
    clientId: string;
    parent_client_id?: string;
    qty?: number | string | null;
    gross_weight_per_package_kg?: number | string | null;
  }[],
  clientId: string,
): number {
  const current = packages.find((pkg) => pkg.clientId === clientId);
  if (!current) return 0;
  const descendantIds = rfqPackageDescendantIds(packages, clientId);
  return packages.reduce((total, pkg) => {
    if (pkg.clientId !== clientId && !descendantIds.has(pkg.clientId)) return total;
    return total + rfqPackageOwnGrossKg(pkg);
  }, 0);
}

export type RfqPackagesTotals = {
  totalCbm: number;
  grossKg: number;
};

export function rfqPackagesTotals(
  pkgs: {
    clientId?: string;
    parent_client_id?: string;
    qty?: number | string | null;
    length_cm?: number | string | null;
    width_cm?: number | string | null;
    height_cm?: number | string | null;
    gross_weight_per_package_kg?: number | string | null;
  }[] = [],
): RfqPackagesTotals {
  const topLevelPackages = pkgs.filter((pkg) => !pkg.parent_client_id);
  const totalCbm = topLevelPackages.reduce((total, pkg) => total + rfqPackageCbm(pkg), 0);
  const grossKg = pkgs.reduce((total, pkg) => total + rfqPackageOwnGrossKg(pkg), 0);
  return { totalCbm, grossKg };
}

/**
 * SEA LCL "W/M" (weight-or-measurement) revenue ton, per the industry rule KBFE follows:
 * 1 CBM ≡ 1 RT and 1000 kg ≡ 1 RT — chargeable RT is whichever is larger. This is distinct
 * from the AIR volumetric divisor (rfqLineDimWeightKg/rfqChargeableWeightKg, ÷6000, kg-based).
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
