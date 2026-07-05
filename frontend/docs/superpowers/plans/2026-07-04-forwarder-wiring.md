# Forwarder Wiring (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Backend (`kbi-mock-api`) tasks should follow the `backend-api-endpoint` skill.

**Goal:** Make every "truck vendor" / "forwarder" picker and display use the real **Forwarder** master data instead of **Supplier**, across the DTO, Carrier-DO, and Shipment flows.

**Architecture:** Field names (`truck_vendor_id`, `forwarder_id`) stay; only the entity they reference changes from Supplier → Forwarder. The frontend owns the contract; the Express mock (`kbi-mock-api`) is synced to embed Forwarder objects and default these ids to Forwarder ids. FE pickers load the full forwarder list and filter client-side (matching the existing master-data "load-all + client filter" pattern).

**Tech Stack:** React + Vite + TypeScript + Mantine + TanStack Query + Vitest (frontend); Express 5 ESM + MockJsonRepository (backend).

## Global Constraints

- Only use the 6 real Forwarder types: `SEA, AIR, TRUCKING, MULTI` (from docs `03_Forwarder.html`). Truck-vendor pickers filter to `{TRUCKING, MULTI}`.
- Do **not** modify the `Supplier` entity, `supplier_roles`, or the `TRUCKING_VENDOR` role — just stop mis-using Supplier here.
- Do **not** rename `truck_vendor_id` / `forwarder_id`.
- Carrier field on Shipment is **out of scope for this plan** — see the companion plan `2026-07-04-carrier-wiring.md`.
- Reuse existing `fetchForwarders` / `normalizeForwarder` (`shared/api/forwarders.ts`) and the `forwarders` query keys (`shared/api/queryKeys.ts`). No new API client.
- FE package: run from `PROJECT-PRODUCT/frontend`, verify with `npm run typecheck && npm run test && npm run check:boundaries`.
- Backend package: run from `kbi-mock-api`, reseed with `npm run mock:seed`, smoke with `npm run mock:smoke`.
- Seed ids: forwarders are `fwd_001`..`fwd_008` (`fwd_001` = FDS, type MULTI; `fwd_002` = Dolphin, MULTI). `fwd_001` is the safe default.

---

## Task 1: Backend — register forwarders collection + embed Forwarder on DTO

**Files:**
- Modify: `kbi-mock-api/src/modules/mockV1/mockV1.service.js:20-42` (collections map), `:3386-3426` (`getDomesticTransportOrderContext`), `:3428-3455` (`enrichDomesticTransportOrder`), `:2702` (create default)

**Interfaces:**
- Produces: DTO API responses where `truck_vendor` is a **Forwarder** record (has `forwarder_code`/`forwarder_name`), resolved from the `forwarders` collection by `truck_vendor_id`.

- [ ] **Step 1: Add `forwarders` (and `carriers`, used by the companion plan) to the collections map**

In the `collections` object (ends at line 42), add after `suppliers: "suppliers",` (line 20):

```js
    forwarders: "forwarders",
    carriers: "carriers",
```

- [ ] **Step 2: Load forwarders in the DTO context**

In `getDomesticTransportOrderContext` (line 3386), add `active(collections.forwarders)` to the `Promise.all` and thread it through. The destructure + return become:

```js
async function getDomesticTransportOrderContext() {
    const [
        domesticTransportOrders,
        domesticTransportOrderLines,
        shipments,
        shipmentLines,
        carrierDeliveryOrders,
        suppliers,
        forwarders,
        purchaseOrderLines,
        lots,
        items,
        itemCustomsProfiles,
        shipmentDtoLinks
    ] = await Promise.all([
        active(collections.domesticTransportOrders),
        active(collections.domesticTransportOrderLines),
        active(collections.shipments),
        active(collections.shipmentLines),
        active(collections.carrierDeliveryOrders),
        active(collections.suppliers),
        active(collections.forwarders),
        active(collections.purchaseOrderLines),
        active(collections.lots),
        active(collections.items),
        active(collections.itemCustomsProfiles),
        active(collections.shipmentDtoLinks)
    ]);

    return {
        domesticTransportOrders,
        domesticTransportOrderLines,
        shipments,
        shipmentLines,
        carrierDeliveryOrders,
        suppliers,
        forwarders,
        purchaseOrderLines,
        lots,
        items,
        itemCustomsProfiles,
        shipmentDtoLinks
    };
}
```

- [ ] **Step 3: Resolve `truck_vendor` from forwarders**

In `enrichDomesticTransportOrder` (line 3431), change:

```js
    const truckVendor = context.suppliers.find((row) => row.id === order.truck_vendor_id) || null;
```

to:

```js
    const truckVendor = context.forwarders.find((row) => row.id === order.truck_vendor_id) || null;
```

- [ ] **Step 4: Default a created DTO's `truck_vendor_id` to null (not a supplier id)**

At line 2702, change `truck_vendor_id: body.truck_vendor_id || "sup_002",` to:

```js
        truck_vendor_id: body.truck_vendor_id || null,
```

- [ ] **Step 5: Reseed existing DTO mock data to forwarder ids**

In `kbi-mock-api/mock-data/domestic-transport-orders.json`, replace every `"truck_vendor_id"` that holds a supplier id (`sup_*`) with a forwarder id. Map trucking-capable vendors to `fwd_001` (FDS, MULTI) unless a more specific forwarder fits. Use a real forwarder id from `mock-data/forwarders.json` (`fwd_001`..`fwd_008`).

- [ ] **Step 6: Reseed + smoke test**

Run: `npm run mock:seed && npm run mock:smoke`
Expected: seed completes; smoke passes. Then `GET /api/v1/domestic-transport-orders` returns records whose `truck_vendor` has `forwarder_code`/`forwarder_name`.

- [ ] **Step 7: Commit**

```bash
git add src/modules/mockV1/mockV1.service.js mock-data/domestic-transport-orders.json
git commit -m "feat(mock): resolve DTO truck_vendor from forwarders master"
```

---

## Task 2: Backend — default + embed Forwarder on Carrier-DO

**Files:**
- Modify: `kbi-mock-api/src/modules/mockV1/mockV1.service.js:2629-2664` (create + list), `:2638` (create default)
- Modify: `kbi-mock-api/mock-data/carrier-delivery-orders.json`

**Interfaces:**
- Produces: Carrier-DO responses from `listCarrierDeliveryOrdersByShipment` where each record has `forwarder` = a Forwarder record resolved by `forwarder_id`.

- [ ] **Step 1: Default a created Carrier-DO's `forwarder_id` to null**

At line 2638, change `forwarder_id: body.forwarder_id || "sup_001",` to:

```js
        forwarder_id: body.forwarder_id || null,
```

- [ ] **Step 2: Embed `forwarder` when listing Carrier-DOs by shipment**

Replace `listCarrierDeliveryOrdersByShipment` (line 2654):

```js
export async function listCarrierDeliveryOrdersByShipment(shipmentId) {
    await requireRecord(collections.shipments, shipmentId, "Shipment not found");
    const [deliveryOrders, forwarders] = await Promise.all([
        active(collections.carrierDeliveryOrders),
        active(collections.forwarders)
    ]);
    return deliveryOrders
        .filter((order) => order.shipment_id === shipmentId)
        .map((order) => ({
            ...order,
            forwarder: forwarders.find((row) => row.id === order.forwarder_id) || null
        }));
}
```

Note: keep the existing body's other behavior (the current function filters by `shipment_id`); this replacement preserves that and adds the embed. If the current function differs, keep its filter/sort and only add the `forwarder` embed to each returned record.

- [ ] **Step 3: Reseed existing Carrier-DO mock data to forwarder ids**

In `kbi-mock-api/mock-data/carrier-delivery-orders.json`, replace every `"forwarder_id"` holding a supplier id (`sup_*`) with a real forwarder id (`fwd_001`..`fwd_008`).

- [ ] **Step 4: Reseed + smoke test**

Run: `npm run mock:seed && npm run mock:smoke`
Expected: pass. `GET /api/v1/shipments/:id/carrier-delivery-orders` returns records with a `forwarder` object.

- [ ] **Step 5: Commit**

```bash
git add src/modules/mockV1/mockV1.service.js mock-data/carrier-delivery-orders.json
git commit -m "feat(mock): resolve carrier-DO forwarder from forwarders master"
```

---

## Task 3: Frontend — retype embedded relations as Forwarder

**Files:**
- Modify: `PROJECT-PRODUCT/frontend/src/shared/api/domesticTransportOrders.ts:6,95`
- Modify: `PROJECT-PRODUCT/frontend/src/shared/api/carrierDeliveryOrders.ts:4,26`
- Modify: `PROJECT-PRODUCT/frontend/src/shared/api/shipments.ts:180`
- Modify: `PROJECT-PRODUCT/frontend/src/shared/api/logistics.ts:1204`

**Interfaces:**
- Consumes: `Forwarder` type from `@shared/api/forwarders`.
- Produces: `DomesticTransportOrderV1.truck_vendor?: Forwarder | null`, `CarrierDeliveryOrderV1.forwarder?: Forwarder | null`, `ShipmentV1.forwarder?: Forwarder | null`. `mapV1Shipment` reads `forwarder.forwarder_name`.

- [ ] **Step 1: DTO type**

In `domesticTransportOrders.ts`, change the import at line 6 from:

```ts
import type { Supplier } from './tradeMasterData';
```

to:

```ts
import type { Forwarder } from './forwarders';
```

Then change line 95 `truck_vendor?: Supplier | null;` to:

```ts
  truck_vendor?: Forwarder | null;
```

(If `Supplier` is still referenced elsewhere in the file, keep both imports instead of replacing.)

- [ ] **Step 2: Carrier-DO type**

In `carrierDeliveryOrders.ts`, change the import at line 4 from `import type { Supplier } from './tradeMasterData';` to:

```ts
import type { Forwarder } from './forwarders';
```

Then change line 26 `forwarder?: Supplier | null;` to:

```ts
  forwarder?: Forwarder | null;
```

- [ ] **Step 3: Shipment type**

In `shipments.ts`, change the `forwarder` embedded field (line 180) `forwarder?: Supplier | null;` to:

```ts
  forwarder?: Forwarder | null;
```

Add `import type { Forwarder } from './forwarders';` near the other imports. If `Supplier` becomes unused in this file, remove its import; otherwise leave it.

- [ ] **Step 4: Fix the shipment→record mapper**

In `logistics.ts` line 1204, change:

```ts
    carrier_name: shipment.carrier ?? shipment.forwarder?.supplier_name ?? '',
```

to:

```ts
    carrier_name: shipment.carrier ?? shipment.forwarder?.forwarder_name ?? '',
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS. Any remaining `.supplier_name` / `.supplier_code` access on these three relations will surface here — fix each to the Forwarder field (`forwarder_name` / `forwarder_code`).

- [ ] **Step 6: Commit**

```bash
git add src/shared/api/domesticTransportOrders.ts src/shared/api/carrierDeliveryOrders.ts src/shared/api/shipments.ts src/shared/api/logistics.ts
git commit -m "refactor(api): type DTO/CDO/shipment forwarder relation as Forwarder"
```

---

## Task 4: Frontend — DTO truck-vendor picker (list page)

**Files:**
- Modify: `PROJECT-PRODUCT/frontend/src/features/domestic-transport-orders/page.tsx:154-162`
- Modify: `PROJECT-PRODUCT/frontend/src/features/domestic-transport-orders/components/DomesticTransportOrderDetail.tsx:78`

**Interfaces:**
- Consumes: `fetchForwarders` from `@shared/api/forwarders`, `queryKeys.forwarders`.
- Produces: `truckVendorOptions` sourced from Forwarders of type `TRUCKING`/`MULTI`.

- [ ] **Step 1: Swap the query source in `page.tsx`**

Replace lines 154-162:

```ts
  const truckVendorsQuery = useQuery({
    queryKey: queryKeys.forwarders({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchForwarders({ page: 1, limit: 100, is_active: true }),
  });
  const truckVendors = (truckVendorsQuery.data?.data ?? []).filter(
    (forwarder) => forwarder.forwarder_type === 'TRUCKING' || forwarder.forwarder_type === 'MULTI',
  );
  const truckVendorOptions = truckVendors.map((forwarder) => ({
    label: `${forwarder.forwarder_code} - ${forwarder.forwarder_name}`,
    value: forwarder.id,
  }));
```

Update the import: replace `import { fetchSuppliers } from '@shared/api/tradeMasterData';` with `import { fetchForwarders } from '@shared/api/forwarders';` (keep `fetchSuppliers` only if still used elsewhere in the file — grep to confirm).

- [ ] **Step 2: Fix the detail display**

In `DomesticTransportOrderDetail.tsx` line 78, change:

```ts
  const truckVendor = order.truck_vendor?.supplier_name ?? order.truck_vendor_id ?? '-';
```

to:

```ts
  const truckVendor = order.truck_vendor?.forwarder_name ?? order.truck_vendor_id ?? '-';
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/domestic-transport-orders/page.tsx src/features/domestic-transport-orders/components/DomesticTransportOrderDetail.tsx
git commit -m "feat(dto): pick truck vendor from Forwarder (TRUCKING/MULTI) master"
```

---

## Task 5: Frontend — Shipment container-creation truck-vendor picker

**Files:**
- Modify: `PROJECT-PRODUCT/frontend/src/features/shipments/components/CreateDtoFromShipmentPanel.tsx:31,99-111`

**Interfaces:**
- Consumes: `fetchForwarders`, `queryKeys.forwarders`.

- [ ] **Step 1: Swap the query source**

Replace lines 99-111:

```ts
  const truckVendorsQuery = useQueries({
    queries: [
      {
        enabled: opened,
        queryKey: queryKeys.forwarders({ page: 1, limit: 100, is_active: true }),
        queryFn: () => fetchForwarders({ page: 1, limit: 100, is_active: true }),
      },
    ],
  })[0];
  const truckVendorOptions = (truckVendorsQuery.data?.data ?? [])
    .filter((forwarder) => forwarder.forwarder_type === 'TRUCKING' || forwarder.forwarder_type === 'MULTI')
    .map((forwarder) => ({
      label: `${forwarder.forwarder_code} - ${forwarder.forwarder_name}`,
      value: forwarder.id,
    }));
```

Change the import at line 31 from `import { fetchSuppliers } from '@shared/api/tradeMasterData';` to `import { fetchForwarders } from '@shared/api/forwarders';`.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/shipments/components/CreateDtoFromShipmentPanel.tsx
git commit -m "feat(shipments): pick container DTO truck vendor from Forwarder master"
```

---

## Task 6: Frontend — Carrier-DO forwarder picker

**Files:**
- Modify: `PROJECT-PRODUCT/frontend/src/features/shipments/components/ShipmentCarrierDoPanel.tsx:31,58-68,132,219`

**Interfaces:**
- Consumes: `fetchForwarders`, `queryKeys.forwarders`.

- [ ] **Step 1: Swap the query source + display**

Change the import at line 31 from `import { fetchSuppliers } from '@shared/api/tradeMasterData';` to `import { fetchForwarders } from '@shared/api/forwarders';`.

Replace lines 58-68:

```ts
  const forwardersQuery = useQuery({
    queryKey: queryKeys.forwarders({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchForwarders({ page: 1, limit: 100, is_active: true }),
  });
  const forwarders = forwardersQuery.data?.data ?? [];
  const forwarderOptions = forwarders.map((forwarder) => ({
    label: `${forwarder.forwarder_code} - ${forwarder.forwarder_name}`,
    value: forwarder.id,
  }));
  const forwarderName = (id: string | null) =>
    forwarders.find((forwarder) => forwarder.id === id)?.forwarder_name ?? id ?? '-';
```

- [ ] **Step 2: Fix the table cell + empty-message copy**

At line 219, change `{cdo.forwarder?.supplier_name ?? forwarderName(cdo.forwarder_id)}` to:

```tsx
                    <Table.Td>{cdo.forwarder?.forwarder_name ?? forwarderName(cdo.forwarder_id)}</Table.Td>
```

At line 132, the `nothingFoundMessage` currently references supplier copy. Change it to forwarder copy:

```tsx
              nothingFoundMessage={forwardersQuery.isLoading ? t('shipments.loadingForwarders') : t('shipments.noForwarderFound')}
```

- [ ] **Step 3: Add the two new i18n keys (EN + VN)**

In `PROJECT-PRODUCT/frontend/src/shared/i18n/messages.ts`, EN block (near line 638/672) add:

```ts
  'shipments.loadingForwarders': 'Loading forwarders...',
  'shipments.noForwarderFound': 'No forwarder found',
```

VN block (near line 2017/2051) add the identical keys:

```ts
  'shipments.loadingForwarders': 'Đang tải forwarders...',
  'shipments.noForwarderFound': 'Không tìm thấy forwarder',
```

- [ ] **Step 4: Typecheck (MessageKey union stays consistent)**

Run: `npm run typecheck`
Expected: PASS — both message blocks must contain the identical new keys.

- [ ] **Step 5: Commit**

```bash
git add src/features/shipments/components/ShipmentCarrierDoPanel.tsx src/shared/i18n/messages.ts
git commit -m "feat(shipments): pick carrier-DO forwarder from Forwarder master"
```

---

## Task 7: Docs — API contract + FE rule

**Files:**
- Modify: `PROJECT-PRODUCT/frontend/docs/API_CONTRACT.md` (DTO, Carrier-DO, Shipment DTOs)

- [ ] **Step 1: Update the contract**

For the DTO, Carrier-DO, and Shipment response DTOs, document that the embedded relation resolves to a **Forwarder**:

```
truck_vendor?: Forwarder   // (DTO) resolved from forwarder_id-space; a domestic trucking forwarder (forwarder_type TRUCKING/MULTI)
forwarder?: Forwarder      // (Carrier-DO, Shipment) the forwarder master record for forwarder_id
```

Note that `truck_vendor_id` / `forwarder_id` now reference the Forwarder collection, not Suppliers.

- [ ] **Step 2: Commit**

```bash
git add docs/API_CONTRACT.md
git commit -m "docs(contract): DTO/CDO/shipment forwarder relations reference Forwarder master"
```

---

## Verification

- [ ] Backend: `npm run mock:seed && npm run mock:smoke` — pass.
- [ ] Frontend: `npm run typecheck && npm run test && npm run check:boundaries` — all pass.
- [ ] Manual (skill `verify`), both servers running:
  - DTO screen "Truck vendor" dropdown lists **Forwarders** (FDS, Dolphin, …), only TRUCKING/MULTI types; DTO detail shows the forwarder name.
  - Shipment → container-creation panel "Truck vendor" lists Forwarders.
  - Shipment → Carrier-DO panel "Forwarder" lists Forwarders; created Carrier-DO row shows the forwarder name.
  - Supplier pickers elsewhere (PO create, etc.) are unchanged.

## Out of scope
- Shipment `carrier` field (companion plan `2026-07-04-carrier-wiring.md`).
- `Supplier` entity / `supplier_roles` / `TRUCKING_VENDOR` role.
- Field renames.
