# Refactor Cleanup P1+P2 (from REFACTOR_AUDIT.md) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the P1+P2 scope of [`docs/REFACTOR_AUDIT.md`](../../REFACTOR_AUDIT.md) (audit dated 2026-07-10, re-checked after merge `b5074cc`): delete provably-dead files and dead exports, kill the two approved dead-weight blocks in the logistics god-modules (`Gd1*` PR/approval types — owner approved **delete outright**; 5 UI-only stubs — verified dead, delete), consolidate duplicated UI onto existing shared components (`Metric`, `FilterToolbar`), extract two small shared helpers (`statusColorVar`, `formatNumber`), introduce a shared `DetailHero`, and split the low-risk fat components. **No behavior change intended anywhere** — every task is delete-dead-code or move-code-preserving-output.

**Explicitly OUT of scope (P3, future plan):** carving the V1→UI mappers out of `src/shared/api/logistics.ts`, splitting `src/shared/model/logistics.ts` per domain, `shipments/page.tsx` / `QuotationForm.tsx` / `CreateDtoFromShipmentPanel.tsx` / DTO page+detail splits, `formatWithUnit`, `AttachmentList` extension.

**Architecture:** Frontend-only (`PROJECT-PRODUCT/frontend`), FSD layout `app → features → entities → shared` enforced by dependency-cruiser. New shared units go in `src/shared/components/` (UI) and `src/shared/utils/` (pure helpers). Extractions preserve the global CSS class contract — especially `metric-card` and `feature-hero-*`, which the Liquid Glass merge (`b5074cc`) now attaches `::before`/`::after` effects to; renaming or dropping those classes silently kills the new visuals.

**Tech Stack:** React 19, TypeScript strict, Vite, Mantine v9, `@tanstack/react-query` v5, Zustand, Vitest (jsdom), ESLint flat config, dependency-cruiser.

## Global Constraints

- **npm only**, Node `>=20.19.0`. Run everything from `PROJECT-PRODUCT/frontend/`.
- **Git root is `PROJECT-PRODUCT/`** (not `frontend/`): repo-relative paths in commits are `frontend/src/...`. Commit from anywhere inside the repo; stage with paths as shown in each task.
- **Zero behavior change.** If a step forces a UI/logic decision, stop and ask — don't improvise.
- Preserve global CSS classes verbatim (`metric-card`, `kbfe-surface-wash*`, `feature-detail-hero`, `feature-hero-*`, `dl-filter-*`, `rfq-metric-card`). Do not touch `src/styles/*.css` except where a task says so.
- i18n: children call `useI18n()` themselves; never pass `t` down as a prop in new components. No new message keys should be needed (we move existing strings); if one becomes necessary, add it to **both** `en` and `vi` maps.
- Keep ESLint at **zero errors** and do not add new warnings (baseline ~99 warnings is tracked; `set-state-in-effect`, `preserve-manual-memoization`, `no-explicit-any` are intentionally warnings — don't fix drive-by, don't add more).
- After **every task**: `npm run verify` (lint + boundaries + typecheck + test + build) must pass. One commit per task with the message given.
- Evidence discipline: deletion steps re-run the audit's grep before deleting. If a grep unexpectedly finds a consumer, **stop and report** instead of deleting.

## File Structure

**Delete (Part A/B):**
- `src/features/master-data/components/CarriersSection.tsx`, `ForwardersSection.tsx`, `DetailField.tsx`, `TaxProfilesCell.tsx`
- `src/features/quotation-requests/components/RfqFormSummaryTiles.tsx`
- `src/shared/components/InfoField.tsx`
- `frontend/` (the stray directory **nested inside** the frontend package — repo path `frontend/frontend/`)
- Dead code inside `src/shared/api/logistics.ts` (5 stub exports) and `src/shared/model/logistics.ts` (dead `Gd1*` PR/approval types)

**Create (Part C/D):**
- `src/shared/components/statusColors.ts` — `STATUS_COLOR_VARS` + `statusColorVar()`
- `src/shared/utils/number.ts` — `formatNumber` / `formatInteger` / `formatCompact`
- `src/shared/components/DetailHero.tsx` — shared detail-page hero body
- `src/features/quotations/components/QuotationOptionComparePanel.tsx`
- `src/features/delivery-orders/components/{DeliveryOrderOverviewTab,DeliveryOrderOpsTab,DeliveryOrderTasksTab}.tsx`
- `src/features/shipments/components/{ShipmentOverviewCard,ShipmentCommandItem,ShipmentProgressTile,ShipmentRouteNode}.tsx`
- `src/shared/components/MobileQuickActions.tsx`
- `src/features/profile/components/{ProfileForm,EmailForm,PasswordForm,AvatarUpload}.tsx`
- `src/features/settings/components/{UserManagementPanel,CreateUserModal}.tsx`

**Modify (main ones):** the 7 detail views (DetailHero adoption), 5 list views (FilterToolbar adoption), ~12 number-formatting call sites, `PoStageBadge.tsx`, `PoStageFilter.tsx`, `QuotationListView.tsx`, `QuotationRequestListView.tsx`, `AppShellLayout.tsx`, `profile/page.tsx`, `settings/page.tsx`.

---

## PART A — P1: delete trash + trivial dedup

### Task A1: Delete 6 dead files + the stray nested `frontend/` tree

**Files:** the 6 dead files listed above; stray tree `frontend/frontend/src/shared/components/__tests__/FeatureHeaderShell.test.tsx` (git-tracked).

Evidence (audit §1.1–1.2, re-verified twice): each file's exported symbol greps to exactly 1 hit — its own definition; the stray test is byte-identical to the real one and outside tsconfig/vitest `include`.

- [ ] **Step 1: Re-verify before deleting** (from `PROJECT-PRODUCT/frontend/`). For each name, expect **exactly 1 hit** (its own `export function` line):

```bash
for n in CarriersSection ForwardersSection DetailField TaxProfilesCell RfqFormSummaryTiles InfoField; do echo "== $n"; grep -rn "\b$n\b" src --include='*.ts*'; done
```

If any name shows a second hit → STOP, report, do not delete that file.

- [ ] **Step 2: Delete** the 6 files and the stray nested tree:

```bash
git rm frontend/src/features/master-data/components/CarriersSection.tsx \
       frontend/src/features/master-data/components/ForwardersSection.tsx \
       frontend/src/features/master-data/components/DetailField.tsx \
       frontend/src/features/master-data/components/TaxProfilesCell.tsx \
       frontend/src/features/quotation-requests/components/RfqFormSummaryTiles.tsx \
       frontend/src/shared/components/InfoField.tsx
git rm -r frontend/frontend/
```

(Paths are repo-root-relative — run from the git root `PROJECT-PRODUCT/`. After staging, `git status` must show exactly 7 deletions; if it shows more, reset and re-check the paths.)

- [ ] **Step 3: Verify + commit**

```bash
npm run verify
git commit -m "chore(frontend): delete 6 dead components + stray nested frontend/ tree (REFACTOR_AUDIT §1.1-1.2)"
```

### Task A2: Replace the 2 local `Metric` re-implementations with shared `Metric`

**Files:** Modify `src/features/quotations/components/QuotationListView.tsx` (local `Metric` at ~321-354 + `metricStatusColorTokens` ~314-319), `src/features/quotation-requests/components/QuotationRequestListView.tsx` (local `Metric` ~276-295). Read first: `src/shared/components/Metric.tsx` (props: `{ className?, color?, format?=true, icon?, label, value, valueClassName? }`; renders `Paper.metric-card kbfe-surface-wash kbfe-surface-wash--emphasis` + `data-surface-tone`).

- [ ] **Step 1:** In each file, compare the local `Metric` JSX against shared `Metric` output. Map: local `rfq-metric-card` class → `className="rfq-metric-card"` prop; pre-formatted string values → pass the string (shared `Metric` only auto-formats `number` values, `format={false}` if a number must render verbatim); icon/color same. If the local component renders anything the shared one cannot (extra node, different class order that CSS relies on), STOP and report.
- [ ] **Step 2:** Delete both local `function Metric` definitions (and `metricStatusColorTokens` in QuotationListView **only if** it has no remaining users in that file after the swap — it feeds the local Metric today; Task A3 replaces its other potential use), import `{ Metric } from '@shared/components/Metric'`, swap call sites.
- [ ] **Step 3:** Visual spot-check: `npm run dev`, open Quotations and Quotation Requests list pages; metric tiles must look identical (incl. the new Liquid Glass gloss, which keys off `metric-card`).
- [ ] **Step 4:** `npm run verify` + commit: `refactor(frontend): use shared Metric in quotations + quotation-requests lists (audit §2.1)`

### Task A3: Shared `statusColorVar` helper (kills the 3-way duplicated color-token map)

**Files:** Create `src/shared/components/statusColors.ts`. Modify `src/features/purchase-orders/components/PoStageBadge.tsx` (map at ~17-26), `src/features/purchase-orders/components/PoStageFilter.tsx` (map + `colorVar()` at ~18-31), and `QuotationListView.tsx` if `metricStatusColorTokens` survived Task A2.

- [ ] **Step 1:** Create `src/shared/components/statusColors.ts` with the union of the duplicated maps (copy the 8-entry map from `PoStageBadge.tsx` verbatim — do not invent values):

```ts
export const STATUS_COLOR_VARS: Record<string, string> = { /* copy the 8 entries from PoStageBadge.tsx:17-26 */ };

export function statusColorVar(colorName: string): string {
  return STATUS_COLOR_VARS[colorName] ?? 'var(--kbfe-primary-color)';
}
```

Fallback note (verified): `PoStageFilter.colorVar` falls back to `var(--kbfe-primary-color)`; PoStageBadge and QuotationListView index the map directly with **no** fallback. The shared helper uses the `--kbfe-primary-color` fallback; the direct-index call sites may keep indexing `STATUS_COLOR_VARS` directly so their (absence of) fallback behavior is unchanged.

- [ ] **Step 2:** Replace the local maps/helpers in the 2-3 files with imports from `@shared/components/statusColors`. Byte-identical rendered styles expected.
- [ ] **Step 3:** `npm run verify` + commit: `refactor(frontend): shared statusColorVar helper, dedupe status color-token maps (audit §2.2)`

---

## PART B — Approved god-module dead-weight removal

### Task B1: Delete the 5 dead UI-only stub exports in `src/shared/api/logistics.ts`

> **Owner decision note:** the review question offered "move to `logisticsUiStubs.ts`" and the owner picked it **assuming screens still call these stubs**. Post-decision verification shows **zero consumers**: `fetchEfmsControl` (line ~1657), `fetchCharges` (~1710), `fetchCustoms` (~1734), `addShipmentCost` (~1871), `deleteShipmentCost` (~1885) are imported by **no file** — `shipments/page.tsx` uses the real `deleteShipmentCost`/`createShipmentCost` from `@shared/api/shipments`. Dead exports get deleted, not relocated. If any grep below disagrees, fall back to the owner's stub-file option for that function.

**Files:** Modify `src/shared/api/logistics.ts`.

- [ ] **Step 1: Re-verify each stub is unimported.** Name collision warning: `addShipmentCost`/`deleteShipmentCost` **also** exist as real functions in `shared/api/shipments.ts`, and `features/shipments/page.tsx` imports those real ones (lines 27/280, import block ends `} from '@shared/api/shipments'`). A bare name-grep therefore WILL show hits — that alone is not a consumer of the stub. The liveness test is: **does any file import the name from `@shared/api/logistics`** (directly or via the `logistics` barrel)?

```bash
for n in fetchEfmsControl fetchCharges fetchCustoms addShipmentCost deleteShipmentCost; do echo "== $n"; grep -rn "\b$n\b" src --include='*.ts*'; done
```

For each hit outside `shared/api/logistics.ts`, open the file and check the import statement's source module. Expected result (verified 2026-07-10): every external hit resolves to `@shared/api/shipments`; zero files import any of the 5 names from `logistics`. Only if a file genuinely imports one of them from `logistics` does the owner's fallback apply (move that one function to `logisticsUiStubs.ts` instead of deleting it).

- [ ] **Step 2:** Delete the 5 functions from `logistics.ts`, including their now-orphaned local helpers **only if** unused elsewhere in the file (grep inside the file for `uiOnlySuccess`, `emptyDashboardStats`, and any types/constants used only by the deleted functions; `fetchDashboardStats` may still use `emptyDashboardStats` — check before touching).
- [ ] **Step 3:** `npm run verify` (typecheck is the safety net) + commit: `chore(frontend): delete 5 dead UI-only stub exports from api/logistics (audit §3.1, owner-approved)`

### Task B2: Delete the dead `Gd1*` PR/approval types from `src/shared/model/logistics.ts` (owner approved: delete outright)

**Files:** Modify `src/shared/model/logistics.ts` (Gd1 block ~556-812) and `src/shared/api/logistics.ts` (drop matching re-exports in its lines ~1-152 barrel + any internal-only usage).

**Keep-list (verified live):** `Gd1CostType` (imported by `shipments/model/marginModel.ts:2`, `shipments/components/ShipmentCostsPanel.tsx:21`), `Gd1PoStageTask` + `Gd1PoStatus` + `Gd1MilestoneCode` + `Gd1ShipmentMilestone` + `Gd1ShipmentCost` (live via `fetchGlobalPoStageTasks`/`updatePoStageTask`/shipment mappers in `api/logistics.ts` consumed by tasks + shipments features). **Delete-candidates:** `Gd1PurchaseRequest`, `Gd1PurchaseRequestLine`, `Gd1PurchaseOrder`, `Gd1PurchaseOrderLine`, `Gd1ApprovalMatrixConfig`, `Gd1PoTaskTemplate`, `Gd1ApprovalStep`, and any other `Gd1*` name that fails the liveness grep.

- [ ] **Step 1: Build the definitive delete list.** For every `Gd1*` type name declared in `model/logistics.ts`:

```bash
grep -on "Gd1[A-Za-z]*" src/shared/model/logistics.ts | cut -d: -f2 | sort -u   # all declared/used names
for n in $(grep -oh "Gd1[A-Za-z]*" src/shared/model/logistics.ts | sort -u); do c=$(grep -rl "\b$n\b" src --include='*.ts*' | grep -cv 'shared/\(model\|api\)/logistics.ts'); echo "$n -> $c external file(s)"; done
```

A name with `0 external file(s)` **and** no use by a *kept* function in `api/logistics.ts` is deletable. Names used internally by `api/logistics.ts` mappers that themselves serve live endpoints stay.

- [ ] **Step 2:** Delete the dead type declarations from `model/logistics.ts` and their re-export lines in `api/logistics.ts`. Expect roughly the PR/approval-matrix block (~250 lines); the exact set comes from Step 1, not from this plan.
- [ ] **Step 3:** `npm run typecheck` — any error means a name was live; restore it and re-run Step 1 for it.
- [ ] **Step 4:** `npm run verify` + commit: `chore(frontend): delete dead Gd1 PR/approval types from model/logistics (audit §3.1b, owner-approved)`

---

## PART C — P2: dedup extractions

### Task C1: Shared `DetailHero` + migrate the 7 detail views

**Files:** Create `src/shared/components/DetailHero.tsx`. Modify: `quotation-requests/components/RfqDetailHero.tsx` (21-66), `shipments/components/ShipmentDetailView.tsx` (70-101), `delivery-orders/components/DeliveryOrderDetail.tsx` (137-205), `purchase-orders/components/PurchaseOrderDetailPanel.tsx` (103-179), `quotations/components/QuotationDetail.tsx` (459-519), `domestic-transport-orders/components/DomesticTransportOrderDetail.tsx` (155-177), `tasks/components/TaskDetail.tsx` (~32). Read first: `src/shared/components/FeatureHeaderShell.tsx`, `src/styles/feature-heroes.css` (note the new `::before` gloss from `b5074cc` — classes must survive verbatim), `src/shared/components/CopyValue.tsx`.

- [ ] **Step 1:** Design `DetailHero` around a **slot model with escape hatches** — the 7 copies share the class contract but NOT one DOM shape (verified deviations listed in Step 3), so a rigid intersection component cannot hit the "identical DOM" bar. Props:

```ts
type DetailHeroProps = {
  identity: ReactNode;            // caller composes icon+Title(+CopyValue)+badges+subtitle+links — Title order (2 vs 3) and extra rows stay caller-side
  facts?: ReactNode;              // caller renders its own <dl className="feature-hero-facts"> (fact shapes vary); or a {label,value}[] convenience overload if all call sites fit
  actions?: ReactNode;            // wrapped in Group.feature-hero-actions
  className?: string;             // feature prefixes: 'purchase-order-detail-hero', 'rfq-detail-hero quote-workflow-detail-hero', …
  withPaper?: boolean;            // default true → Paper root; false → plain div root (TaskDetail)
  collapseLayout?: boolean;       // default false → root.feature-detail-hero > div.feature-hero-layout; true → both classes on the root element (ShipmentDetailView)
  paperProps?: PaperProps & { component?: any; 'aria-labelledby'?: string };  // pass-through for p={0}/p="md", component="section", aria (RfqDetailHero)
};
```

  Rule: the component owns only the skeleton (`feature-detail-hero`, `feature-hero-layout`, `feature-hero-actions` wrappers); everything that differs between views flows through slots/props so rendered DOM stays byte-compatible.
- [ ] **Step 2:** Migrate **one simple view first** (`RfqDetailHero.tsx` — needs `component="section"` + `aria-labelledby` via `paperProps`) and diff the rendered DOM (React devtools or test snapshot) against the old markup: same element structure, same class strings, same order, same padding. Fix `DetailHero` until identical.
- [ ] **Step 3:** Migrate the remaining 6 views one at a time, running `npm run test` after each. **Verified special cases:**
  - `ShipmentDetailView.tsx:71` — both hero classes sit on **one** `Paper` (`p="md"`, plus `workbench-section shipment-detail-identity`), no nested layout div → use `collapseLayout` + `className` + `paperProps={{ p: 'md' }}`.
  - `TaskDetail.tsx:32` — hero is a plain `div` (not `Paper`) inside its own `Paper.task-detail-workbench` → `withPaper={false}`; do not double-wrap.
  - DTO detail and TaskDetail don't use `FeatureHeaderShell` — do **not** add it (that's a behavior change); they use `DetailHero` standalone.
  - QuotationDetail stacks 3 hero classes (`rfq-detail-hero feature-detail-hero quote-workflow-detail-hero`) — pass extras via `className`.
  - Padding differs per view (`p={0}` vs `p="md"`) — always forward the view's current value via `paperProps`; never normalize.
  - If a view still can't reproduce its exact DOM through the slots, **skip it and note it in the commit message** rather than restructuring its DOM — the Liquid Glass `::before` rules key off these classes and padding, so a silent structure change is CSS-visible.
- [ ] **Step 4:** Visual pass in `npm run dev` over all 7 detail screens (light + dark; the Liquid Glass gloss must still show on hero surfaces).
- [ ] **Step 5:** `npm run verify` + commit: `refactor(frontend): shared DetailHero, migrate 7 detail views (audit §2.3)`

### Task C2: Adopt shared `FilterToolbar` in the 5 hand-rolled list filter panels

**Files:** Read first: `src/shared/components/FilterToolbar.tsx` + its one existing consumer `shipments/components/ShipmentListView.tsx:125-243` (the reference usage). Modify: `quotations/components/QuotationListView.tsx` (90-111), `quotation-requests/components/QuotationRequestListView.tsx` (156-158), `purchase-orders/components/PurchaseOrderListView.tsx` (135-139), `delivery-orders/components/DeliveryOrderListView.tsx` (111-114), `tasks/components/TasksFilterPanel.tsx` (80-83).

- [ ] **Step 1:** For each file, map its hand-rolled header (`dl-filter-panel`/`dl-filter-head`/`dl-filter-head__control`/`dl-filter-result`) onto `FilterToolbar`'s props; the feature-specific filter row moves into the `children` slot **unchanged**. If a panel's header deviates structurally (extra control in the head row that `FilterToolbar` has no slot for), extend `FilterToolbar` with an optional slot rather than forking — or skip that file and note it in the commit message.
- [ ] **Step 2:** Migrate one file per commit-able chunk; after each, check the page in dev: segment counts, shown-count text, clear/refresh behavior identical.
- [ ] **Step 3:** `npm run verify` + commit: `refactor(frontend): adopt FilterToolbar in 5 list views (audit §2.4)`

### Task C3: Shared plain-number formatter

**Files:** Create `src/shared/utils/number.ts`. Read first: `src/shared/utils/money.ts` (reuse its `activeLocale` machinery — import it, don't duplicate). Modify call sites (audit §2.5): `quotations/components/QuotationListView.tsx:72,78,84`, `quotation-requests/components/QuotationRequestListView.tsx:289`, `quotations/components/QuotationFeeTable.tsx:54`, `QuotationForm.tsx:600`, `QuotationChargeBreakdown.tsx:323`, `RfqQuotationPickerModal.tsx:91`, `purchase-orders/components/PoLinesTable.tsx:350-362` (compact), `domestic-transport-orders/model/domesticTransportOrderModel.ts:82`, `purchase-orders/components/LotCard.tsx:49`, `shipments/components/CustomsLineDrawer.tsx:57`.

- [ ] **Step 1:** Implement `formatNumber(value, opts?)`, `formatInteger(value)`, `formatCompact(value)` in `src/shared/utils/number.ts` using the money module's active locale. Add a Vitest unit test file `src/shared/utils/__tests__/number.test.ts` (cover grouping, null/undefined → `'-'` if that's the call-site convention — read call sites first and match the dominant convention).
- [ ] **Step 2:** Replace the listed call sites. **Known accepted behavior change (approved by audit):** sites hardcoding `'en-US'` vs `'vi-VN'` unify onto the shared locale — note it in the commit body. Any site whose output must keep a quirk (e.g. PoLinesTable compact notation thresholds) gets its quirk reproduced in `formatCompact`, not left inline.
- [ ] **Step 3:** `npm run verify` + commit: `refactor(frontend): shared formatNumber/formatInteger/formatCompact, unify number locales (audit §2.5)`

---

## PART D — P2: low-risk fat-component splits (pure moves, no logic edits)

Each task below is a **JSX/state relocation with zero logic change**: create the new file(s), move the code, add imports/exports, keep prop and store wiring identical. All new components call `useI18n()` internally.

### Task D1: `QuotationDetail.tsx` (729) → extract compare panel

- [ ] Move `CompareDeltaPill` (~107), `CompareMetric` (~127), `QuotationOptionComparePanel` (~159) + the compare helpers (~83-159) from `src/features/quotations/components/QuotationDetail.tsx` into new `src/features/quotations/components/QuotationOptionComparePanel.tsx` (3 units may share this one file only if only `QuotationOptionComparePanel` is exported; otherwise one file each per convention — prefer exporting only the panel).
- [ ] `npm run verify` + commit: `refactor(frontend): extract QuotationOptionComparePanel from QuotationDetail (audit §3.2)`

### Task D2: `DeliveryOrderDetail.tsx` (673) → per-tab components

- [ ] Extract the 3 fat `Tabs.Panel` bodies into `DeliveryOrderOverviewTab.tsx` (~297…), `DeliveryOrderOpsTab.tsx` (~393-535 incl. inline gate+risk panels), `DeliveryOrderTasksTab.tsx` (~541-587). Documents + source-lines panels already delegate — leave them.
- [ ] `npm run verify` + commit: `refactor(frontend): split DeliveryOrderDetail into per-tab components (audit §3.2)`

### Task D3: `ShipmentDetailView.tsx` (486) → move 4 in-file cards out

- [ ] Move `ShipmentOverviewCard`, `ShipmentCommandItem`, `ShipmentProgressTile`, `ShipmentRouteNode` each to its own file under `src/features/shipments/components/`.
- [ ] `npm run verify` + commit: `refactor(frontend): one-unit-per-file for ShipmentDetailView inner cards (audit §3.2)`

### Task D4: `AppShellLayout.tsx` (596) → extract `MobileQuickActions`

- [ ] Move `MobileQuickActions` (defined in-file at ~360) to `src/shared/components/MobileQuickActions.tsx`. Nav-item config stays put in this pass (moving it to `shared/navigation/` is optional follow-up, not this task).
- [ ] `npm run verify` + commit: `refactor(frontend): extract MobileQuickActions from AppShellLayout (audit §3.2)`

### Task D5: `profile/page.tsx` (439) → decompose the flat feature

- [ ] Create `src/features/profile/components/` and move the three forms + avatar upload into `ProfileForm.tsx`, `EmailForm.tsx`, `PasswordForm.tsx`, `AvatarUpload.tsx`; `page.tsx` becomes the thin orchestrator wiring auth context + layout. Each form keeps its own `useForm`/state exactly as-is.
- [ ] `npm run verify` + commit: `refactor(frontend): decompose profile feature into components (audit §3.2)`

### Task D6: `settings/page.tsx` (554) → extract user management

- [ ] Move the users table into `src/features/settings/components/UserManagementPanel.tsx` and the user-create modal into `CreateUserModal.tsx`; preferences tabs stay in `page.tsx`. No new store — state moves with the components that own it.
- [ ] `npm run verify` + commit: `refactor(frontend): extract UserManagementPanel + CreateUserModal from settings page (audit §3.2)`

---

## Verification (end-to-end)

1. `npm run verify` green after every task (lint 0 errors / no new warnings, boundaries, typecheck, tests, build).
2. Manual dev pass at the end: walk PO → DO → Shipment → DTO detail screens, Quotations + RFQ lists (metrics/filters), Tasks board, Profile, Settings, mobile bottom bar — everything renders and behaves as before, Liquid Glass effects intact on hero/metric/chrome surfaces, light + dark + high-contrast.
3. `git log --oneline` shows one commit per task; `git status` clean.
4. Update `docs/REFACTOR_AUDIT.md`: mark executed items (strike-through or ✅) so the audit stays truthful as the tracking doc.
