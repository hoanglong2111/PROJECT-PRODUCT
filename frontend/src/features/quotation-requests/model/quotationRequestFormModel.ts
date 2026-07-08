import type {
  CreateQuotationRequestContainerPayload,
  CreateQuotationRequestLinePayload,
  CreateQuotationRequestPackagePayload,
  CreateQuotationRequestPayload,
  QuotationRequestV1,
} from '@shared/api/quotationRequests';

import {
  isAirMode,
  newRfqContainer,
  newRfqContainerLine,
  newRfqPackage,
  newRfqPackageLine,
  rfqPackageCbm,
  type RfqContainerDraft,
  type RfqPackageDraft,
} from './quotationRequestModel';

export type PackageModeKey = 'AIR' | 'SEA_LCL';
export type PackagesByMode = Record<PackageModeKey, RfqPackageDraft[]>;
export type ActivePackageIdByMode = Record<PackageModeKey, string | null>;

export const num = (value: unknown): number | null => {
  if (value === '' || value == null) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

export const textOrEmpty = (value: string | null | undefined) => value ?? '';

export const numOrDefault = (value: unknown, fallback = 0) => num(value) ?? fallback;

export type EffectiveLine = {
  item_id: string;
  item_description: string;
  qty: number;
  unit: string;
  unit_price: number;
  note: string;
};

export function packagesToLines(packages: RfqPackageDraft[]): EffectiveLine[] {
  return packages.flatMap((pkg) => pkg.lines
    .filter((line) => line.item_id && Number(line.qty) > 0)
    .map((line) => ({
      item_id: line.item_id,
      item_description: line.item_description,
      qty: numOrDefault(line.qty, 1),
      unit: line.unit,
      unit_price: numOrDefault(line.unit_price),
      note: line.note,
    })));
}

export function containersToLines(containers: RfqContainerDraft[]): EffectiveLine[] {
  return containers.flatMap((container) => container.lines
    .filter((line) => line.item_id && Number(line.qty) > 0)
    .map((line) => ({
      item_id: line.item_id,
      item_description: line.item_description,
      qty: numOrDefault(line.qty, 1),
      unit: line.unit,
      unit_price: numOrDefault(line.unit_price),
      note: line.note,
    })));
}

export function sourcePackagesToDrafts(source?: QuotationRequestV1): RfqPackageDraft[] {
  if (source?.packages?.length) {
    const drafts = source.packages.map((pkg, index) => newRfqPackage(index, {
      package_type: pkg.package_type ?? '',
      length_cm: num(pkg.length_cm) ?? '',
      width_cm: num(pkg.width_cm) ?? '',
      height_cm: num(pkg.height_cm) ?? '',
      qty: numOrDefault(pkg.qty, 1),
      gross_weight_per_package_kg: num(pkg.gross_weight_per_package_kg) ?? '',
      lines: pkg.lines?.length
        ? pkg.lines.map((line) => newRfqPackageLine({
          item_id: line.item_id ?? '',
          item_description: line.item_description ?? line.item?.item_name_en ?? line.item?.item_name ?? '',
          qty: numOrDefault(line.qty, 1),
          unit: line.unit ?? line.item?.base_uom ?? '',
          unit_price: num(line.unit_price) ?? '',
          note: line.note ?? '',
        }))
        : [newRfqPackageLine()],
      note: pkg.note ?? '',
    }));
    const clientIdByPackageNo = new Map(source.packages.map((pkg, index) => [pkg.package_no, drafts[index].clientId]));
    source.packages.forEach((pkg, index) => {
      if (pkg.parent_package_no != null) {
        drafts[index].parent_client_id = clientIdByPackageNo.get(pkg.parent_package_no) ?? '';
      }
    });
    return drafts;
  }
  const legacyLines = source?.lines?.filter((line) => num(line.length_cm) && num(line.width_cm) && num(line.height_cm));
  if (legacyLines?.length) {
    return legacyLines.map((line, index) => {
      const qty = numOrDefault(line.qty, 1);
      const grossTotal = num(line.gross_weight_kg) ?? 0;
      return newRfqPackage(index, {
        package_type: '',
        length_cm: num(line.length_cm) ?? '',
        width_cm: num(line.width_cm) ?? '',
        height_cm: num(line.height_cm) ?? '',
        qty,
        gross_weight_per_package_kg: qty > 0 ? Number((grossTotal / qty).toFixed(3)) : '',
        lines: [newRfqPackageLine({
          item_id: line.item_id ?? '',
          item_description: line.item_description ?? line.item?.item_name_en ?? line.item?.item_name ?? '',
          qty,
          unit: line.unit ?? line.item?.base_uom ?? '',
          unit_price: num(line.unit_price) ?? '',
          note: line.note ?? '',
        })],
      });
    });
  }
  return [newRfqPackage(0)];
}

export function packageModeKey(mode?: string | null): PackageModeKey {
  return isAirMode(mode) ? 'AIR' : 'SEA_LCL';
}

export function sourcePackagesByModeToDrafts(source?: QuotationRequestV1): PackagesByMode {
  const sourceModeKey = packageModeKey(source?.mode);
  const sourceDrafts = sourcePackagesToDrafts(source);
  return {
    AIR: sourceModeKey === 'AIR' ? sourceDrafts : [newRfqPackage(0)],
    SEA_LCL: sourceModeKey === 'SEA_LCL' ? sourceDrafts : [newRfqPackage(0)],
  };
}

export function sourceContainersToDrafts(source?: QuotationRequestV1): RfqContainerDraft[] {
  if (source?.containers?.length) {
    return source.containers.map((container) => newRfqContainer({
      container_type: container.container_type ?? '',
      qty: numOrDefault(container.qty, 1),
      lines: container.lines?.length
        ? container.lines.map((line) => newRfqContainerLine({
          item_id: line.item_id ?? '',
          item_description: line.item_description ?? line.item?.item_name_en ?? line.item?.item_name ?? '',
          qty: numOrDefault(line.qty, 1),
          unit: line.unit ?? line.item?.base_uom ?? '',
          unit_price: num(line.unit_price) ?? '',
          gross_weight_kg: num(line.gross_weight_kg) ?? '',
          note: line.note ?? '',
        }))
        : [newRfqContainerLine()],
    }));
  }
  if (source?.lines?.length) {
    return [newRfqContainer({
      container_type: source.container_type ?? '',
      qty: 1,
      lines: source.lines.map((line) => newRfqContainerLine({
        item_id: line.item_id ?? '',
        item_description: line.item_description ?? line.item?.item_name_en ?? line.item?.item_name ?? '',
        qty: numOrDefault(line.qty, 1),
        unit: line.unit ?? line.item?.base_uom ?? '',
        unit_price: num(line.unit_price) ?? '',
        gross_weight_kg: num(line.gross_weight_kg) ?? '',
        note: line.note ?? '',
      })),
    })];
  }
  if (source?.container_type) {
    return [newRfqContainer({ container_type: source.container_type, qty: 1 })];
  }
  return [newRfqContainer()];
}

export type BuildCreatePayloadState = {
  customerRef: string;
  customerPoRef: string;
  customerContractRef: string;
  supplierId: string | null;
  incoterm: string | null;
  mode: string | null;
  currency: string | null;
  originPort: string;
  destinationPort: string;
  readyDate: string | null;
  note: string;
  fclMode: boolean;
  airMode: boolean;
  lclMode: boolean;
  totalWeight: number;
  totalCbm: number;
  dimWeight: number;
  chargeableWeight: number;
  chargeableRevenueTon: number;
  effectiveLines: EffectiveLine[];
  packages: RfqPackageDraft[];
  containers: RfqContainerDraft[];
};

/**
 * Builds the POST /quotation-requests payload from the form's derived state. Extracted
 * verbatim from the form's create mutation so the field mapping stays a single, testable
 * pure function.
 */
export function buildCreateQuotationRequestPayload(state: BuildCreatePayloadState): CreateQuotationRequestPayload {
  const {
    customerRef, customerPoRef, customerContractRef, supplierId, incoterm, mode, currency,
    originPort, destinationPort, readyDate, note,
    fclMode, airMode, lclMode,
    totalWeight, totalCbm, dimWeight, chargeableWeight, chargeableRevenueTon,
    effectiveLines, packages, containers,
  } = state;

  const packagesForPayload = packages.filter((pkg) => rfqPackageCbm(pkg) > 0);
  const packageNoByClientId = new Map(packagesForPayload.map((pkg, index) => [pkg.clientId, index + 1]));

  return {
    customer_ref: customerRef.trim() || null,
    customer_po_ref: customerPoRef.trim() || null,
    customer_contract_ref: customerContractRef.trim() || null,
    supplier_id: supplierId,
    incoterm_code: incoterm,
    mode,
    currency_code: currency,
    origin_port: originPort.trim() || null,
    destination_port: destinationPort.trim() || null,
    desired_cargo_ready_date: readyDate,
    gross_weight_kg: totalWeight || null,
    volume_cbm: fclMode ? null : totalCbm || null,
    dim_weight_kg: airMode ? dimWeight || null : null,
    chargeable_weight_kg: airMode ? chargeableWeight || null : null,
    chargeable_revenue_ton: lclMode ? chargeableRevenueTon || null : null,
    container_type: fclMode ? containers[0]?.container_type.trim() || null : null,
    note: note.trim() || null,
    lines: effectiveLines.map<CreateQuotationRequestLinePayload>((line, index) => ({
      line_no: index + 1,
      item_id: line.item_id,
      item_description: line.item_description || null,
      qty: line.qty,
      unit: line.unit || null,
      unit_price: line.unit_price || null,
      note: line.note || null,
    })),
    packages: fclMode
      ? []
      : packagesForPayload.map<CreateQuotationRequestPackagePayload>((pkg, index) => ({
        package_no: index + 1,
        package_type: pkg.package_type,
        length_cm: num(pkg.length_cm),
        width_cm: num(pkg.width_cm),
        height_cm: num(pkg.height_cm),
        qty: numOrDefault(pkg.qty, 1),
        gross_weight_per_package_kg: num(pkg.gross_weight_per_package_kg),
        cbm: rfqPackageCbm(pkg) || null,
        lines: pkg.lines
          .filter((line) => line.item_id && Number(line.qty) > 0)
          .map((line, lineIndex) => ({
            line_no: lineIndex + 1,
            item_id: line.item_id,
            item_description: line.item_description || null,
            qty: numOrDefault(line.qty, 1),
            unit: line.unit || null,
            unit_price: num(line.unit_price),
            note: line.note || null,
          })),
        note: pkg.note || null,
        parent_package_no: pkg.parent_client_id ? packageNoByClientId.get(pkg.parent_client_id) ?? null : null,
      })),
    containers: fclMode
      ? containers
          .filter((container) => container.container_type && Number(container.qty) > 0)
          .map<CreateQuotationRequestContainerPayload>((container, index) => ({
            container_no: index + 1,
            container_type: container.container_type,
            qty: numOrDefault(container.qty, 1),
            lines: container.lines
              .filter((line) => line.item_id && Number(line.qty) > 0)
              .map((line, lineIndex) => ({
                line_no: lineIndex + 1,
                item_id: line.item_id,
                item_description: line.item_description || null,
                qty: numOrDefault(line.qty, 1),
                unit: line.unit || null,
                unit_price: num(line.unit_price),
                gross_weight_kg: num(line.gross_weight_kg),
                note: line.note || null,
              })),
          }))
      : [],
  };
}
