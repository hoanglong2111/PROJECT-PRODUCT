# Carrier Wiring (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Backend (`kbi-mock-api`) tasks should follow the `backend-api-endpoint` skill. **Run after** `2026-07-04-forwarder-wiring.md`.

**Goal:** Let a Shipment reference the real **Carrier** master (SHIPPING_LINE / AIRLINE) via a new `carrier_id`, chosen from a dropdown filtered by transport mode, while keeping the existing free-text `carrier` name for backward-compatible list/detail/filter display.

**Architecture:** Add `carrier_id` to the Shipment DTO + payloads. Keep the denormalized `carrier` (name) string as the display value; when the user picks a Carrier, the create panel writes **both** `carrier_id` (reference) and `carrier` (the selected carrier's name). No embedded object is added (avoids colliding with the existing `carrier` name field and keeps the mapper unchanged). A pure `carrierTypeForMode` helper drives the mode→carrier-type filter.

**Tech Stack:** React + Vite + TypeScript + Mantine + TanStack Query + Vitest (frontend); Express 5 ESM + MockJsonRepository (backend).

## Global Constraints

- Only the 2 real Carrier types exist: `SHIPPING_LINE`, `AIRLINE` (docs `03_Forwarder.html`; seed `carr_001`..`carr_010`).
- Keep the `carrier` name string on Shipment — do not remove it. Selecting a `carrier_id` also sets `carrier` (name).
- Reuse existing `fetchCarriers` / `normalizeCarrier` (`shared/api/forwarders.ts`) and the `carriers` query keys. No new API client.
- Depends on Phase 1 having already added `carriers: "carriers"` to the backend `collections` map (Task 1, Step 1 of the forwarder plan). If Phase 1 was skipped, add that line first.
- FE: run from `PROJECT-PRODUCT/frontend`, verify `npm run typecheck && npm run test && npm run check:boundaries`.
- Backend: run from `kbi-mock-api`, `npm run mock:seed && npm run mock:smoke`.

---

## Task 1: Backend — store `carrier_id` on shipments

**Files:**
- Modify: `kbi-mock-api/src/modules/mockV1/mockV1.service.js:2084-2102` (`createShipmentFromDeliveryOrder` insert), `:2427-2447` (`updateShipment` allowedFields)

**Interfaces:**
- Produces: shipment records carrying `carrier_id` (string|null) alongside the existing `carrier` (string|null). `getShipment` already spreads `...shipment`, so `carrier_id` flows to responses with no extra change.

- [ ] **Step 1: Add `carrier_id` to the create insert (and fix the forwarder default)**

In the `repo.insert(collections.shipments, { … })` block (lines 2084-2102), change:

```js
        forwarder_id: body.forwarder_id || "sup_001",
        carrier: body.carrier || "Mock Carrier",
```

to:

```js
        forwarder_id: body.forwarder_id || null,
        carrier_id: body.carrier_id || null,
        carrier: body.carrier || null,
```

(`forwarder_id` default is corrected from the stray supplier id `sup_001` to `null`; `carrier` no longer injects the "Mock Carrier" placeholder.)

- [ ] **Step 2: Allow `carrier_id` on update**

In `updateShipment`'s `allowedFields` array (lines 2427-2447), add `"carrier_id"` next to `"carrier"`:

```js
        "carrier",
        "carrier_id",
```

- [ ] **Step 3: Reseed + smoke test**

Run: `npm run mock:seed && npm run mock:smoke`
Expected: pass. A shipment created with `{ "carrier_id": "carr_003", "carrier": "COSCO Shipping Lines" }` round-trips both fields.

- [ ] **Step 4: Commit**

```bash
git add src/modules/mockV1/mockV1.service.js
git commit -m "feat(mock): store carrier_id on shipments"
```

---

## Task 2: Frontend — add `carrier_id` to Shipment types

**Files:**
- Modify: `PROJECT-PRODUCT/frontend/src/shared/api/shipments.ts:146-185` (`ShipmentV1`), `:202-220` (`CreateShipmentFromDeliveryOrderPayload`), `:222-247` (`UpdateShipmentPayload`)

**Interfaces:**
- Produces: `ShipmentV1.carrier_id: string | null`; `CreateShipmentFromDeliveryOrderPayload.carrier_id?: string | null`; `UpdateShipmentPayload` includes `'carrier_id'`.

- [ ] **Step 1: Add the field to `ShipmentV1`**

In `ShipmentV1` (after `carrier: string | null;`, line 153) add:

```ts
  carrier_id: string | null;
```

- [ ] **Step 2: Add to the create payload**

In `CreateShipmentFromDeliveryOrderPayload` (after `carrier?: string | null;`, line 208) add:

```ts
  carrier_id?: string | null;
```

- [ ] **Step 3: Add to the update payload**

In the `UpdateShipmentPayload` `Pick<…>` union (line 228 has `| 'carrier'`), add:

```ts
    | 'carrier_id'
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/api/shipments.ts
git commit -m "feat(api): add carrier_id to shipment DTO + payloads"
```

---

## Task 3: Frontend — thread `carrierId` through the logistics adapter

**Files:**
- Modify: `PROJECT-PRODUCT/frontend/src/shared/api/logistics.ts:426-434` (`CreateShipmentPayload`), `:1393-1408` (`createShipment` mapping)

**Interfaces:**
- Consumes: `CreateShipmentFromDeliveryOrderPayload.carrier_id`.
- Produces: `CreateShipmentPayload.carrierId?: string | null` passed through to the V1 create request.

- [ ] **Step 1: Add `carrierId` to the FE-facing payload type**

In `CreateShipmentPayload` (line 426), after `carrierName?: string | null;` (line 433) add:

```ts
  carrierId?: string | null;
```

- [ ] **Step 2: Map it into the V1 request**

In `createShipment` (line 1393), add `carrier_id` to `requestPayload` next to `carrier`:

```ts
    carrier: payload.carrierName ?? null,
    carrier_id: payload.carrierId ?? null,
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/shared/api/logistics.ts
git commit -m "feat(shipments): thread carrierId through createShipment"
```

---

## Task 4: Frontend — mode→carrier-type helper (TDD)

**Files:**
- Modify: `PROJECT-PRODUCT/frontend/src/features/shipments/model/shipmentModel.ts`
- Test: `PROJECT-PRODUCT/frontend/src/features/shipments/model/__tests__/shipmentModel.test.ts` (create if absent)

**Interfaces:**
- Produces: `carrierTypeForMode(mode?: string | null): 'SHIPPING_LINE' | 'AIRLINE' | null` — `AIR`→`AIRLINE`, `SEA`→`SHIPPING_LINE`, anything else→`null` (no filter).

- [ ] **Step 1: Write the failing test**

```ts
// shipmentModel.test.ts
import { describe, expect, it } from 'vitest';
import { carrierTypeForMode } from '../shipmentModel';

describe('carrierTypeForMode', () => {
  it('maps AIR to AIRLINE', () => {
    expect(carrierTypeForMode('AIR')).toBe('AIRLINE');
  });
  it('maps SEA to SHIPPING_LINE', () => {
    expect(carrierTypeForMode('SEA')).toBe('SHIPPING_LINE');
  });
  it('returns null for other modes (no carrier-type filter)', () => {
    expect(carrierTypeForMode('ROAD')).toBeNull();
    expect(carrierTypeForMode(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- shipmentModel`
Expected: FAIL — `carrierTypeForMode` is not exported.

- [ ] **Step 3: Implement the helper**

Add to `shipmentModel.ts`:

```ts
export function carrierTypeForMode(mode?: string | null): 'SHIPPING_LINE' | 'AIRLINE' | null {
  const normalized = (mode ?? '').toUpperCase();
  if (normalized === 'AIR') return 'AIRLINE';
  if (normalized === 'SEA') return 'SHIPPING_LINE';
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- shipmentModel`
Expected: PASS (3 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/features/shipments/model/shipmentModel.ts src/features/shipments/model/__tests__/shipmentModel.test.ts
git commit -m "feat(shipments): add carrierTypeForMode helper"
```

---

## Task 5: Frontend — Carrier dropdown in the create panel

**Files:**
- Modify: `PROJECT-PRODUCT/frontend/src/features/delivery-orders/components/CreateShipmentFromDoPanel.tsx:1-16,44,75,84-100,149`

**Interfaces:**
- Consumes: `fetchCarriers` (`@shared/api/forwarders`), `queryKeys.carriers`, `carrierTypeForMode` (Task 4).
- Produces: create panel submits `carrierId` + `carrierName` from the selected Carrier.

- [ ] **Step 1: Add imports**

Add near the existing imports:

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchCarriers } from '@shared/api/forwarders';
import { carrierTypeForMode } from '@features/shipments/model/shipmentModel';
```

(`useMutation, useQueryClient` are already imported from `@tanstack/react-query`; add `useQuery` to that import if it groups them.)

- [ ] **Step 2: Replace the free-text carrier state with an id**

At line 44 change `const [carrier, setCarrier] = useState('');` to:

```ts
  const [carrierId, setCarrierId] = useState<string | null>(null);
```

At the reset in the `useEffect` (line 75) change `setCarrier('');` to `setCarrierId(null);`.

- [ ] **Step 3: Load carriers + build filtered options**

After the `loadTypeOptions` block (around line 65) add:

```ts
  const carriersQuery = useQuery({
    queryKey: queryKeys.carriers({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchCarriers({ page: 1, limit: 100, is_active: true }),
  });
  const wantedCarrierType = carrierTypeForMode(mode);
  const carriers = (carriersQuery.data?.data ?? []).filter(
    (carrier) => !wantedCarrierType || carrier.carrier_type === wantedCarrierType,
  );
  const carrierOptions = carriers.map((carrier) => ({
    label: `${carrier.carrier_code} - ${carrier.carrier_name}`,
    value: carrier.id,
  }));
  const selectedCarrier = carriers.find((carrier) => carrier.id === carrierId) ?? null;
```

- [ ] **Step 4: Send `carrierId` + `carrierName` on submit**

In the `createShipment({ … })` call (line 93 has `carrierName: carrier.trim() || undefined,`), replace it with:

```ts
        carrierId: carrierId || undefined,
        carrierName: selectedCarrier?.carrier_name || undefined,
```

- [ ] **Step 5: Replace the carrier TextInput with a Select**

At line 149, replace:

```tsx
          <TextInput label={t('quotations.carrier')} placeholder={t('shipments.carrierPlaceholder')} value={carrier} onChange={(event) => setCarrier(event.currentTarget.value)} />
```

with:

```tsx
          <Select
            label={t('quotations.carrier')}
            placeholder={t('shipments.carrierPlaceholder')}
            data={carrierOptions}
            value={carrierId}
            onChange={setCarrierId}
            searchable
            clearable
            nothingFoundMessage={carriersQuery.isLoading ? t('shipments.loadingCarriers') : t('shipments.noCarrierFound')}
          />
```

(`Select` is already imported in this file.)

- [ ] **Step 6: Add the two new i18n keys (EN + VN)**

In `PROJECT-PRODUCT/frontend/src/shared/i18n/messages.ts`, EN block (near the other `shipments.*` keys) add:

```ts
  'shipments.loadingCarriers': 'Loading carriers...',
  'shipments.noCarrierFound': 'No carrier found',
```

VN block add the identical keys:

```ts
  'shipments.loadingCarriers': 'Đang tải carriers...',
  'shipments.noCarrierFound': 'Không tìm thấy carrier',
```

- [ ] **Step 7: Typecheck + tests**

Run: `npm run typecheck && npm run test -- shipmentModel`
Expected: PASS. (Both message blocks must carry the two new keys.)

- [ ] **Step 8: Commit**

```bash
git add src/features/delivery-orders/components/CreateShipmentFromDoPanel.tsx src/shared/i18n/messages.ts
git commit -m "feat(shipments): choose carrier from Carrier master (mode-filtered) on create"
```

---

## Task 6: Docs — API contract

**Files:**
- Modify: `PROJECT-PRODUCT/frontend/docs/API_CONTRACT.md` (Shipment DTO)

- [ ] **Step 1: Document `carrier_id`**

In the Shipment DTO section, add:

```
carrier_id: string | null   // reference to Carrier master (carrier_type SHIPPING_LINE/AIRLINE)
carrier: string | null      // denormalized carrier name kept for display/filter; set alongside carrier_id when chosen
```

- [ ] **Step 2: Commit**

```bash
git add docs/API_CONTRACT.md
git commit -m "docs(contract): add shipment carrier_id referencing Carrier master"
```

---

## Verification

- [ ] Backend: `npm run mock:seed && npm run mock:smoke` — pass.
- [ ] Frontend: `npm run typecheck && npm run test && npm run check:boundaries` — all pass.
- [ ] Manual (skill `verify`), both servers running:
  - Delivery-order → "Create shipment" panel shows a **Carrier** dropdown listing the Carrier master; for an AIR shipment only AIRLINE carriers show, for SEA only SHIPPING_LINE.
  - After creating, the Shipment detail "Carrier" row shows the chosen carrier's name (`carrier_name`).
  - Existing shipments (blank/other carrier) still render without error.

## Out of scope
- Editing carrier on an existing shipment via a dedicated edit form (create-path only here; `updateShipment` already accepts `carrier`/`carrier_id` at the API layer).
- Embedding a full Carrier object on shipment responses (denormalized name is sufficient for display; a real backend may populate `carrier` from `carrier_id`).
- Forwarder wiring (companion plan `2026-07-04-forwarder-wiring.md`).
