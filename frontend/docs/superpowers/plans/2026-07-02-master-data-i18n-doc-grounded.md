# Master-Data i18n Doc-Grounded Display — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every coded master-data enum value render exactly as the source docs define it (raw code or doc English text, identical in both languages), removing all fabricated translations, while UI chrome stays bilingual.

**Architecture:** The display seam is `src/features/master-data/model/masterDataModel.ts`. Type-label helpers return the raw value; milestone/department/rev-cost resolve through language-neutral doc-text maps. Charge group/category get a doc-grounded `docLabel` on the shared `chargeCategories.ts` lists. Cells, filter Selects, and modals consume these; the orphaned i18n keys are then deleted from `messages.ts`.

**Tech Stack:** React 18 + TypeScript, Mantine 9, Vitest (pure-model unit tests), `@shared/i18n` dictionary (`en`/`vi` in `messages.ts`).

## Global Constraints

- Source of truth = `kbi-mock-api/docs/master_data/*.html`. Never invent a translation; only use text that exists in the docs.
- Coded enum VALUES render identically in EN and VI (raw code, or doc English/verbatim text). Record data is never translated (already the case — do not touch it).
- UI chrome (column headers, buttons, filter field labels, empty states, generic tooltips like Active/Edit) stays bilingual via `t()`.
- Scope = the whole master-data screen (all tabs, cells + filters + modals). Do NOT change the Quotations feature (`QuotationForm.tsx`, `quotationCharges.ts`) — leave its `labelKey` usage intact.
- Use npm only. Verify with `npm run typecheck`, `npm run build`, and `npm run verify` (boundaries + test + build). Node >=20.19.0.
- Commit after each task.

### Canonical doc-grounded values (copy verbatim)

Milestone (mock `milestone_code` → doc text):
`PRE_SHIPMENT`→`Pre-shipment`, `MS1_BOOKING_CONFIRMED`→`MS-1 Booking confirmed`, `MS2_CARGO_READY`→`MS-2 Cargo ready`, `MS3_LOADED`→`MS-3 Loaded`, `MS4_IN_TRANSIT`→`MS-4 In transit`, `MS5_ARRIVED_PORT`→`MS-5 Arrived port`, `MS6_CUSTOMS_SUBMITTED`→`MS-6 Customs submitted`, `MS7_CUSTOMS_CLEARED`→`MS-7 Customs cleared`, `MS8_DELIVERED_GATE`→`MS-8 Delivered to gate`.

Department (mock `department` → doc label, Vietnamese kept verbatim):
`FDS_SALES`→`FDS Sales`, `FDS_OPS`→`FDS Ops`, `FDS_OPS_CUSTOMS`→`FDS Ops (Customs)`, `FDS_ACCOUNTING`→`FDS Kế toán`, `KBI_PURCHASING`→`KBI – Mua hàng`, `KBI_WAREHOUSE`→`KBI Kho`.

Rev/Cost (mock `rev_cost` → doc word): `REVENUE`→`Revenue`, `COST`→`Cost`, `BOTH`→`Both`.

Charge groups (`group` → docLabel): `ORIGIN_EXPORT`→`Origin / Export`, `MAIN_FREIGHT`→`Main Freight (Carriage)`, `FREIGHT_SURCHARGE`→`Freight Surcharges`, `DOCUMENTATION_FILING`→`Documentation & Filing`, `DESTINATION_IMPORT`→`Destination / Import`, `ANCILLARY_ACCESSORIAL`→`Ancillary / Accessorial`, `SERVICE_OTHER`→`Service / Other`.

Charge categories (`category` → docLabel): `ORIGIN`→`Origin`, `CUSTOMS`→`Customs`, `DOCUMENTATION`→`Documentation`, `FREIGHT`→`Freight`, `SURCHARGE`→`Surcharge`, `DESTINATION`→`Destination`, `DISBURSEMENT`→`Disbursement`, `ANCILLARY`→`Ancillary`, `SERVICE`→`Service`.

Type value lists (raw codes): supplier `OVERSEAS_SEA/OVERSEAS_AIR/DOMESTIC`; item category `NVL/BTP/TP/CCDC/DONG_GOI`; item type `RAW/SEMI/FG/CONSUMABLE/PACKAGING`; forwarder `SEA/AIR/TRUCKING/MULTI`; carrier `SHIPPING_LINE/AIRLINE`.

---

### Task 1: Add doc-grounded `docLabel` to shared charge lists

**Files:**
- Modify: `src/shared/lib/chargeCategories.ts`
- Test: `src/shared/lib/__tests__/chargeCategories.test.ts` (create)

**Interfaces:**
- Produces: `CHARGE_GROUPS` and `CHARGE_CATEGORIES` entries each gain `docLabel: string` (existing `value` and `labelKey` unchanged).

- [ ] **Step 1: Write the failing test**

Create `src/shared/lib/__tests__/chargeCategories.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { CHARGE_CATEGORIES, CHARGE_GROUPS } from '@shared/lib/chargeCategories';

describe('charge list docLabels', () => {
  it('maps every group value to its doc English label', () => {
    const byValue = Object.fromEntries(CHARGE_GROUPS.map((g) => [g.value, g.docLabel]));
    expect(byValue.ORIGIN_EXPORT).toBe('Origin / Export');
    expect(byValue.MAIN_FREIGHT).toBe('Main Freight (Carriage)');
    expect(byValue.SERVICE_OTHER).toBe('Service / Other');
  });

  it('maps every category value to its doc English label', () => {
    const byValue = Object.fromEntries(CHARGE_CATEGORIES.map((c) => [c.value, c.docLabel]));
    expect(byValue.FREIGHT).toBe('Freight');
    expect(byValue.DISBURSEMENT).toBe('Disbursement');
  });

  it('keeps a docLabel on every entry', () => {
    for (const entry of [...CHARGE_GROUPS, ...CHARGE_CATEGORIES]) {
      expect(entry.docLabel.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/lib/__tests__/chargeCategories.test.ts`
Expected: FAIL (`docLabel` is `undefined` / type error).

- [ ] **Step 3: Add `docLabel` to both lists**

In `src/shared/lib/chargeCategories.ts`, extend the array element type and every entry:

```ts
export const CHARGE_GROUPS: ReadonlyArray<{ value: string; labelKey: MessageKey; docLabel: string }> = [
  { value: 'ORIGIN_EXPORT', labelKey: 'masterData.chargeGroupOriginExport', docLabel: 'Origin / Export' },
  { value: 'MAIN_FREIGHT', labelKey: 'masterData.chargeGroupMainFreight', docLabel: 'Main Freight (Carriage)' },
  { value: 'FREIGHT_SURCHARGE', labelKey: 'masterData.chargeGroupFreightSurcharge', docLabel: 'Freight Surcharges' },
  { value: 'DOCUMENTATION_FILING', labelKey: 'masterData.chargeGroupDocumentationFiling', docLabel: 'Documentation & Filing' },
  { value: 'DESTINATION_IMPORT', labelKey: 'masterData.chargeGroupDestinationImport', docLabel: 'Destination / Import' },
  { value: 'ANCILLARY_ACCESSORIAL', labelKey: 'masterData.chargeGroupAncillaryAccessorial', docLabel: 'Ancillary / Accessorial' },
  { value: 'SERVICE_OTHER', labelKey: 'masterData.chargeGroupServiceOther', docLabel: 'Service / Other' },
] as const;

export const CHARGE_CATEGORIES: ReadonlyArray<{ value: string; labelKey: MessageKey; docLabel: string }> = [
  { value: 'ORIGIN', labelKey: 'masterData.chargeCategoryOrigin', docLabel: 'Origin' },
  { value: 'CUSTOMS', labelKey: 'masterData.chargeCategoryCustoms', docLabel: 'Customs' },
  { value: 'DOCUMENTATION', labelKey: 'masterData.chargeCategoryDocumentation', docLabel: 'Documentation' },
  { value: 'FREIGHT', labelKey: 'masterData.chargeCategoryFreight', docLabel: 'Freight' },
  { value: 'SURCHARGE', labelKey: 'masterData.chargeCategorySurcharge', docLabel: 'Surcharge' },
  { value: 'DESTINATION', labelKey: 'masterData.chargeCategoryDestination', docLabel: 'Destination' },
  { value: 'DISBURSEMENT', labelKey: 'masterData.chargeCategoryDisbursement', docLabel: 'Disbursement' },
  { value: 'ANCILLARY', labelKey: 'masterData.chargeCategoryAncillary', docLabel: 'Ancillary' },
  { value: 'SERVICE', labelKey: 'masterData.chargeCategoryService', docLabel: 'Service' },
] as const;
```

Leave `CHARGE_CATEGORY_GROUPS` alias as-is.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/lib/__tests__/chargeCategories.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/chargeCategories.ts src/shared/lib/__tests__/chargeCategories.test.ts
git commit -m "feat(master-data): add doc-grounded docLabel to charge lists"
```

---

### Task 2: Make the model seam return raw codes / doc text

**Files:**
- Modify: `src/features/master-data/model/masterDataModel.ts`
- Test: `src/features/master-data/model/__tests__/masterDataModel.test.ts` (create)

**Interfaces:**
- Produces (signatures unchanged so existing call sites keep compiling):
  - `getSupplierTypeLabel(value, t)`, `getItemCategoryLabel(value, t)`, `getItemTypeLabel(value, t)`, `getForwarderTypeLabel(value, t)`, `getCarrierTypeLabel(value, t)` → return the **raw `value`** (`'-'` when empty). `t` retained but unused.
  - `getMilestoneLabel(code, t)` → doc text from `MILESTONE_DOC_LABELS` (`'—'` when empty).
  - `getDepartmentLabel(code, t)` → doc text from `DEPARTMENT_DOC_LABELS` (`'-'` when empty).
  - New `getRevCostLabel(value: string): string` → doc word from `REV_COST_LABELS` (falls back to raw).
  - `SUPPLIER_TYPE_VALUES`, `ITEM_CATEGORY_VALUES`, `ITEM_TYPE_VALUES`, `FORWARDER_TYPE_VALUES`, `CARRIER_TYPE_VALUES` remain exported `string[]` of raw codes.

- [ ] **Step 1: Write the failing test**

Create `src/features/master-data/model/__tests__/masterDataModel.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  CARRIER_TYPE_VALUES,
  getCarrierTypeLabel,
  getDepartmentLabel,
  getItemCategoryLabel,
  getMilestoneLabel,
  getRevCostLabel,
  getSupplierTypeLabel,
} from '../masterDataModel';

// A t() that would translate if (wrongly) used — proves labels are language-neutral.
const t = ((key: string) => `TRANSLATED:${key}`) as never;

describe('master-data enum labels are doc-grounded, not translated', () => {
  it('returns the raw code for type enums', () => {
    expect(getSupplierTypeLabel('OVERSEAS_SEA', t)).toBe('OVERSEAS_SEA');
    expect(getItemCategoryLabel('NVL', t)).toBe('NVL');
    expect(getCarrierTypeLabel('SHIPPING_LINE', t)).toBe('SHIPPING_LINE');
  });

  it('maps milestone/department codes to doc text', () => {
    expect(getMilestoneLabel('MS1_BOOKING_CONFIRMED', t)).toBe('MS-1 Booking confirmed');
    expect(getDepartmentLabel('FDS_ACCOUNTING', t)).toBe('FDS Kế toán');
    expect(getDepartmentLabel('KBI_PURCHASING', t)).toBe('KBI – Mua hàng');
  });

  it('maps rev_cost to the doc English word', () => {
    expect(getRevCostLabel('REVENUE')).toBe('Revenue');
    expect(getRevCostLabel('BOTH')).toBe('Both');
  });

  it('exposes raw-code value lists for filters', () => {
    expect(CARRIER_TYPE_VALUES).toEqual(['SHIPPING_LINE', 'AIRLINE']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/master-data/model/__tests__/masterDataModel.test.ts`
Expected: FAIL (`getRevCostLabel` not exported; type labels currently return translated text).

- [ ] **Step 3: Replace the label maps/helpers in `masterDataModel.ts`**

Delete `supplierTypeLabelKeys`, `itemCategoryLabelKeys`, `itemTypeLabelKeys`, `forwarderTypeLabelKeys`, `carrierTypeLabelKeys`, `localizedValue`, `milestoneLabelKeys`, `departmentLabelKeys`. Replace with raw-code lists and doc-text maps:

```ts
export const SUPPLIER_TYPE_VALUES = ['OVERSEAS_SEA', 'OVERSEAS_AIR', 'DOMESTIC'];
export const ITEM_CATEGORY_VALUES = ['NVL', 'BTP', 'TP', 'CCDC', 'DONG_GOI'];
export const ITEM_TYPE_VALUES = ['RAW', 'SEMI', 'FG', 'CONSUMABLE', 'PACKAGING'];
export const FORWARDER_TYPE_VALUES = ['SEA', 'AIR', 'TRUCKING', 'MULTI'];
export const CARRIER_TYPE_VALUES = ['SHIPPING_LINE', 'AIRLINE'];

// Docs define these as fixed codes with no translation — render them verbatim in both languages.
function rawValue(value: string | null | undefined) {
  return value ? value : '-';
}

export function getSupplierTypeLabel(value: string | null | undefined, _t: (key: string) => string) {
  return rawValue(value);
}
export function getItemCategoryLabel(value: string | null | undefined, _t: (key: string) => string) {
  return rawValue(value);
}
export function getItemTypeLabel(value: string | null | undefined, _t: (key: string) => string) {
  return rawValue(value);
}
export function getForwarderTypeLabel(value: string | null | undefined, _t: (key: string) => string) {
  return rawValue(value);
}
export function getCarrierTypeLabel(value: string | null | undefined, _t: (key: string) => string) {
  return rawValue(value);
}

// Docs provide readable text for these — use it verbatim, identical in every language.
const MILESTONE_DOC_LABELS: Record<string, string> = {
  PRE_SHIPMENT: 'Pre-shipment',
  MS1_BOOKING_CONFIRMED: 'MS-1 Booking confirmed',
  MS2_CARGO_READY: 'MS-2 Cargo ready',
  MS3_LOADED: 'MS-3 Loaded',
  MS4_IN_TRANSIT: 'MS-4 In transit',
  MS5_ARRIVED_PORT: 'MS-5 Arrived port',
  MS6_CUSTOMS_SUBMITTED: 'MS-6 Customs submitted',
  MS7_CUSTOMS_CLEARED: 'MS-7 Customs cleared',
  MS8_DELIVERED_GATE: 'MS-8 Delivered to gate',
};

const DEPARTMENT_DOC_LABELS: Record<string, string> = {
  FDS_SALES: 'FDS Sales',
  FDS_OPS: 'FDS Ops',
  FDS_OPS_CUSTOMS: 'FDS Ops (Customs)',
  FDS_ACCOUNTING: 'FDS Kế toán',
  KBI_PURCHASING: 'KBI – Mua hàng',
  KBI_WAREHOUSE: 'KBI Kho',
};

const REV_COST_LABELS: Record<string, string> = {
  REVENUE: 'Revenue',
  COST: 'Cost',
  BOTH: 'Both',
};

export function getMilestoneLabel(code: string | null | undefined, _t: (key: string) => string) {
  if (!code) return '—';
  return MILESTONE_DOC_LABELS[code] ?? code;
}

export function getDepartmentLabel(code: string | null | undefined, _t: (key: string) => string) {
  if (!code) return '-';
  return DEPARTMENT_DOC_LABELS[code] ?? code;
}

export function getRevCostLabel(value: string): string {
  return REV_COST_LABELS[value] ?? value;
}
```

Remove the now-unused `MilestoneCode`/`DepartmentCode` type imports only if TypeScript flags them as unused; otherwise leave the import line untouched.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/master-data/model/__tests__/masterDataModel.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck (proves no call site broke)**

Run: `npm run typecheck`
Expected: no errors. (Type badges and filters already render raw/doc text through the unchanged signatures.)

- [ ] **Step 6: Commit**

```bash
git add src/features/master-data/model/masterDataModel.ts src/features/master-data/model/__tests__/masterDataModel.test.ts
git commit -m "feat(master-data): render enum codes raw + doc-text milestone/dept/rev-cost"
```

---

### Task 3: Charge group/category & rev-cost use doc text in cells, filters, modal

**Files:**
- Modify: `src/features/master-data/components/referenceColumns.tsx`
- Modify: `src/features/master-data/page.tsx`
- Modify: `src/features/master-data/components/ChargeCodeModal.tsx`

**Interfaces:**
- Consumes: `CHARGE_GROUPS[].docLabel`, `CHARGE_CATEGORIES[].docLabel` (Task 1); `getRevCostLabel` (Task 2).

- [ ] **Step 1: referenceColumns — charge group/category → docLabel; rev-cost → doc word**

In `src/features/master-data/components/referenceColumns.tsx`:

Replace the `revCostLabel` helper (lines ~50-54) with an import-based call. Delete the local `revCostLabel` function and add `getRevCostLabel` to the existing import from `../model/masterDataModel`. Keep `revCostShort` and `revCostColor`.

In `buildChargeCodeColumns`, change the label maps to `docLabel`:

```ts
const groupLabelMap = Object.fromEntries(CHARGE_GROUPS.map((group) => [group.value, group.docLabel]));
const categoryLabelMap = Object.fromEntries(CHARGE_CATEGORIES.map((category) => [category.value, category.docLabel]));
```

In the `revCost` column render, use the doc word for the tooltip:

```tsx
render: (chargeCode) => (
  <Tooltip label={getRevCostLabel(chargeCode.rev_cost)}>
    <Badge color={revCostColor(chargeCode.rev_cost)} variant="light">
      {revCostShort(chargeCode.rev_cost)}
    </Badge>
  </Tooltip>
),
```

- [ ] **Step 2: page.tsx — charge filters use docLabel + getRevCostLabel**

In `src/features/master-data/page.tsx`:

`chargeCategoryOptions` (line ~212):

```ts
...CHARGE_CATEGORIES.map((category) => ({ label: category.docLabel, value: category.value })),
```

`chargeGroupOptions` (line ~219):

```ts
...CHARGE_GROUPS.map((group) => ({
  label: `${group.docLabel} (${chargeGroupCounts[group.value] ?? 0})`,
  value: group.value,
})),
```

`chargeRevCostOptions` (line ~229) — import `getRevCostLabel` from the model and use it:

```ts
const chargeRevCostOptions = useMemo(
  () => [
    { label: t('common.all'), value: 'ALL' },
    { label: getRevCostLabel('REVENUE'), value: 'REVENUE' },
    { label: getRevCostLabel('COST'), value: 'COST' },
    { label: getRevCostLabel('BOTH'), value: 'BOTH' },
  ],
  [t],
);
```

(The `supplierTypeOptions`/`itemCategoryOptions`/`itemTypeOptions` at lines ~245-265 already render raw codes via the Task 2 helpers — leave them unchanged.)

- [ ] **Step 3: ChargeCodeModal — group/category/rev-cost use doc text**

In `src/features/master-data/components/ChargeCodeModal.tsx`:

Group Select data (line ~152):

```tsx
data={CHARGE_GROUPS.map((group) => ({ label: group.docLabel, value: group.value }))}
```

Category Select data (line ~159):

```tsx
data={CHARGE_CATEGORIES.map((category) => ({ label: category.docLabel, value: category.value }))}
```

Rev/Cost Select data (lines ~176-180) — import `getRevCostLabel` from `../model/masterDataModel`:

```tsx
data={[
  { label: getRevCostLabel('REVENUE'), value: 'REVENUE' },
  { label: getRevCostLabel('COST'), value: 'COST' },
  { label: getRevCostLabel('BOTH'), value: 'BOTH' },
]}
```

- [ ] **Step 4: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add src/features/master-data/components/referenceColumns.tsx src/features/master-data/page.tsx src/features/master-data/components/ChargeCodeModal.tsx
git commit -m "feat(master-data): charge group/category/rev-cost show doc text"
```

---

### Task 4: TransportModeModal option labels → raw code

**Files:**
- Modify: `src/features/master-data/components/TransportModeModal.tsx`

- [ ] **Step 1: Replace translated mode-type options with raw codes**

In `src/features/master-data/components/TransportModeModal.tsx` (lines ~121-126), replace the translated labels with raw codes (keep the header label + glossary hint on line ~120 as bilingual chrome):

```tsx
data={[
  { label: 'SEA', value: 'SEA' },
  { label: 'AIR', value: 'AIR' },
  { label: 'ROAD', value: 'ROAD' },
  { label: 'RAIL', value: 'RAIL' },
]}
```

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git add src/features/master-data/components/TransportModeModal.tsx
git commit -m "feat(master-data): transport-mode type options show raw code"
```

---

### Task 5: Delete orphaned fabricated i18n keys

**Files:**
- Modify: `src/shared/i18n/messages.ts`

**Interfaces:**
- Consumes: confirmation from Tasks 2-4 that nothing references these keys anymore. `MessageKey = keyof typeof en`, so `npm run typecheck` fails if any `t('removed.key')` remains — this is the safety net.

- [ ] **Step 1: Remove the fabricated per-value keys from BOTH `en` and `vi`**

In `src/shared/i18n/messages.ts`, delete these keys from **both** the `en` object and the `vi` object (keep the header keys `masterData.itemCategory`, `masterData.itemType`, `masterData.supplierType`, `masterData.forwarderType`, `masterData.carrierType`, `masterData.transportModeType`, `masterData.revCost`, `masterData.department`, `masterData.milestoneCode`, and all `glossary.*`):

- `masterData.itemCategoryNvl`, `...Btp`, `...Tp`, `...Ccdc`, `...DongGoi`
- `masterData.itemTypeRaw`, `...Semi`, `...Fg`, `...Consumable`, `...Packaging`
- `masterData.supplierTypeOverseasSea`, `...OverseasAir`, `...Domestic`
- `masterData.forwarderTypeSea`, `...Air`, `...Trucking`, `...Multi`
- `masterData.carrierTypeShippingLine`, `...Airline`
- `masterData.transportModeTypeSea`, `...Air`, `...Fcl`, `...Lcl`, `...Road`, `...Rail`, `...Multimodal`
- `masterData.revCostRevenue`, `...Cost`, `...Both`
- `masterData.milestonePreShipment`, `...BookingConfirmed`, `...CargoReady`, `...Loaded`, `...InTransit`, `...ArrivedPort`, `...CustomsSubmitted`, `...CustomsCleared`, `...DeliveredGate`
- `masterData.departmentFdsSales`, `...FdsOps`, `...FdsOpsCustoms`, `...FdsAccounting`, `...KbiPurchasing`, `...KbiWarehouse`

- [ ] **Step 2: Typecheck (fails loudly on any leftover reference)**

Run: `npm run typecheck`
Expected: no errors. If a `MessageKey` error appears, a call site still references a deleted key — fix that call site to use the raw value / doc text before continuing.

- [ ] **Step 3: Full verify**

Run: `npm run verify`
Expected: boundaries + test + build all pass.

- [ ] **Step 4: Commit**

```bash
git add src/shared/i18n/messages.ts
git commit -m "chore(i18n): drop fabricated master-data enum translations"
```

---

## Manual verification (after Task 5)

1. `cd kbi-mock-api && npm run dev` and `cd PROJECT-PRODUCT/frontend && npm run dev`.
2. On each master-data tab, toggle workspace language EN ↔ VI and confirm every coded value is **identical** in both languages:
   - Items: `item_category` = NVL/BTP/… , `item_type` = RAW/SEMI/…
   - Suppliers: `supplier_type` = OVERSEAS_SEA/… ; Forwarders `SEA/AIR/…`; Carriers `SHIPPING_LINE/AIRLINE`.
   - Charge Codes: group = "Main Freight (Carriage)"…, category = "Freight"…, Rev/Cost badge tooltip = Revenue/Cost/Both.
   - Task Templates: milestone = "MS-1 Booking confirmed"…, department = "FDS Sales" / "KBI – Mua hàng" / "FDS Kế toán".
   - Transport Modes: type = SEA/AIR/ROAD/RAIL.
3. Confirm each filter Select option matches its cell value, and create/edit modals show the same option text.
4. Confirm record data (names, descriptions, `charge_name_vn`, `uom_name_vn`) is unchanged, and UI chrome (headers, buttons) still translates EN↔VI.

## Self-review notes

- **Spec coverage:** rule 1 (raw codes) → Task 2; rule 1 (doc-text: milestone/dept/rev-cost/charge group-cat) → Tasks 1-3; whole-screen scope incl. Transport Modes modal → Task 4; delete fabricated keys → Task 5; record data + UI chrome untouched by construction. Quotations explicitly out of scope (Global Constraints).
- **Type consistency:** `getRevCostLabel` defined in Task 2, consumed in Tasks 2-test/3; `docLabel` defined in Task 1, consumed in Task 3; type-label helper signatures kept `(value, t)` so no call site breaks before Task 5's typecheck gate.
- **Ordering:** each task leaves the build green; `messages.ts` deletion is last so `keyof typeof en` typecheck catches any missed reference.
