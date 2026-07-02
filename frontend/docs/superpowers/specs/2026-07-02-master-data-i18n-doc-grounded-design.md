# Master-Data i18n — Doc-Grounded Display (Design)

**Date:** 2026-07-02
**Scope:** `PROJECT-PRODUCT/frontend/src/features/master-data/` + shared i18n
**Status:** Approved in brainstorming; next step is writing-plans.

## Context

After the master-data screen redesign landed, the i18n layer still **fabricates
translations** for coded enum values that the source-of-truth docs
(`kbi-mock-api/docs/master_data/*.html`) define as fixed codes or English logistics
terms. Examples in [`src/shared/i18n/messages.ts`](../../../src/shared/i18n/messages.ts):

- `supplierType*` → "Overseas sea supplier" / "Nhà cung cấp quốc tế đường biển"
- `itemCategory*` → "Raw materials" / "Nguyên vật liệu"
- `itemType*` → "Raw" / "Nguyên liệu"
- `forwarderType*` / `carrierType*` → added glosses like "SEA - Sea freight" / "SEA - Đường biển"
- translated `revCost*`

The docs never contain those translations — they are invented ("bịa"). The user's rule:
**the docs are the source of truth.** Values render exactly as the docs show them (English
stays English, Vietnamese stays Vietnamese, codes stay codes); only UI chrome (headers,
buttons, filter labels) is bilingual, and i18n text must be grounded in a doc description —
never fabricated.

### What the docs actually define (verified by reading all 7 files)

| Field | Doc form | Rule |
|---|---|---|
| `item_category` | NVL / BTP / TP / CCDC / DONG_GOI (codes, no gloss) | raw code |
| `item_type` | RAW / SEMI / FG / CONSUMABLE / PACKAGING (codes) | raw code |
| `supplier_type` | OVERSEAS_SEA / OVERSEAS_AIR / DOMESTIC (codes) | raw code |
| `forwarder_type` | SEA / AIR / TRUCKING / MULTI (codes) | raw code |
| `carrier_type` | SHIPPING_LINE / AIRLINE (codes) | raw code |
| transport-mode type | SEA / AIR / FCL / LCL / ROAD / RAIL / MULTIMODAL (codes) | raw code |
| charge `category` | Origin / Freight / Customs / Documentation / Surcharge / Destination / Disbursement / Ancillary / Service (English) | doc English, language-neutral |
| charge `group` | ORIGIN / EXPORT, MAIN FREIGHT (CARRIAGE)… (English) | doc English, language-neutral |
| `rev_cost` | Both / Cost / Revenue (English words) | doc English word |
| `default_uom` | SHPT / CNTR / WM… (codes) | raw code |
| `milestone` | "MS-1 Booking confirmed" … "MS-8 Delivered to warehouse gate" (English) | doc text, language-neutral |
| `department` | "FDS Sales", "KBI – Mua hàng", "FDS Kế toán", "FDS Ops (Customs)" (mixed) | doc text, verbatim |
| `charge_name_en` / `charge_name_vn` | separate EN + VN columns in doc | both are data — unchanged |
| `uom_name_en` / `uom_name_vn` | separate EN + VN columns in doc | both are data — unchanged |
| all record names / descriptions | data | unchanged (already raw) |

## Design — three rules

**Rule 1 — Coded enum VALUES are never translated; identical in EN and VI.**
- *Pure codes* (no doc-defined readable name) render the **raw value**: `item_category`,
  `item_type`, `supplier_type`, `forwarder_type`, `carrier_type`, transport-mode type,
  `default_uom`.
- *Docs give an English/readable term* → render that **doc text, language-neutral** (same
  string both languages): charge `category`, charge `group`, `rev_cost` (Revenue/Cost/Both),
  `milestone` (code → doc phrase), `department` (code → doc label, kept verbatim incl. Vietnamese).

**Rule 2 — Record data is unchanged.** Names, descriptions, emails, `charge_name_vn`,
`uom_name_vn`, etc. already render raw. No change.

**Rule 3 — UI chrome stays bilingual via `t()`.** Column headers, buttons, filter field
labels, empty states, and generic tooltips ("Active"/"Inactive"/"Edit") remain translated.
Header info-hints must be grounded in a doc description, not invented.

## Scope

Applies to **every master-data tab**, including Transport Modes / Currencies / Incoterms
(not in the 6 docs but coded the same way) — any enum value without a doc-defined translation
renders raw.

## Implementation outline (details deferred to writing-plans)

- **[`model/masterDataModel.ts`](../../../src/features/master-data/model/masterDataModel.ts):**
  remove fabricated per-value i18n maps (`supplierTypeLabelKeys`, `itemCategoryLabelKeys`,
  `itemTypeLabelKeys`, `forwarderTypeLabelKeys`, `carrierTypeLabelKeys`) and `localizedValue`.
  `getXxxTypeLabel()` removed or returns the raw value. Keep the `*_VALUES` code lists (filters
  still need them). Replace milestone/department i18n-key maps with **language-neutral doc-text
  maps** (code → exact doc string).
- **[`components/referenceColumns.tsx`](../../../src/features/master-data/components/referenceColumns.tsx):**
  category/type/supplier-/forwarder-/carrier-type badges render the raw code; `rev_cost` badge
  shows the doc English word (drop the Vietnamese tooltip); charge `group`/`category` render the
  doc English label.
- **[`shared/i18n/messages.ts`](../../../src/shared/i18n/messages.ts):** delete the orphaned
  fabricated keys from **both `en` and `vi`** (`supplierType*`, `itemCategory*`, `itemType*`,
  `forwarderType*`, `carrierType*`, translated `revCost*`, and the milestone/department
  translation keys superseded by the static map). Keep all header/label/action keys.
- **Filter Selects** (`page.tsx`, `ForwardersSection.tsx`, `CarriersSection.tsx`,
  `TaskTemplatesSection.tsx`): option labels use the same raw codes / doc text as the cells so
  filter ↔ cell read identically.

**Cross-screen note:** charge `group`/`category` labels come from the shared
`chargeCategories.ts` lib (also used by Quotations). Rendering the doc English term there keeps
terminology consistent across screens (an improvement); confirm exact wording and check
quotation usage during planning.

## Non-goals

- No backend / mock / API-contract changes. No changes to record data. No change to the
  redesign's layout/columns/StatusDot work. Not adding new languages.

## Verification

1. `npm run typecheck` and `npm run build`.
2. Toggle language EN ↔ VI on every tab: confirm every coded enum value is identical
   (raw code / doc text) with no fabricated Vietnamese; record data unchanged; UI chrome
   still translates.
3. Confirm filter option labels match the cell values.
4. `npm run verify` (boundaries + test + build) before committing.
