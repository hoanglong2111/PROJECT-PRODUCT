# REFACTOR AUDIT — KBFE Frontend

> **Execution note (2026-07-10):** P1 (xóa rác), P2 dedup (Metric/statusColorVar/DetailHero/FilterToolbar/formatNumber) và toàn bộ D-series (D1–D6) đã triển khai THẬT — các component tách ra sở hữu code + state của chính nó, page chỉ orchestrate (DeliveryOrderDetail 686→362, profile 443→101, settings 556→335 dòng). Đã xóa thêm 2 mục owner-approved: khối `Gd1*` PR/approval dead types và 5 UI-only stub (xác minh 0 consumer → xóa thay vì quarantine). Lint 95 warnings (dưới baseline ~99), `npm run verify` xanh. Còn lại: P3 (carve mappers `api/logistics.ts` 1841 dòng, tách `model/logistics.ts` per-domain, fat pages risk cao).

> **Ngày audit:** 2026-07-10 · **Phạm vi:** `PROJECT-PRODUCT/frontend` (src/ ~344 file TS/TSX/CSS, ~53.000 dòng TS/TSX, 14 features)
> **Re-check hậu merge `b5074cc`** (Liquid Glass UI — 6 file CSS + 1 dòng `ConfirmModal.tsx`): mọi finding và line-reference trong báo cáo **vẫn nguyên giá trị** — merge chỉ thêm rule CSS trên các class sẵn có (`.metric-card`, `.feature-detail-hero`, popover/modal glass) kèm fallback high-contrast/reduced-motion đầy đủ, không thêm/xóa file TS/TSX nào, không đụng dead files hay dependencies. Lưu ý liên quan: các đề xuất 2.1 (Metric) và 2.3 (DetailHero) càng phải **bảo toàn nguyên vẹn class contract** `metric-card` / `feature-hero-*` vì lớp Liquid Glass mới gắn thêm hiệu ứng lên đúng các class đó.
> **Trạng thái:** CHỈ AUDIT — chưa sửa/xóa bất kỳ file nào. Mọi kết luận "không dùng" đều có bằng chứng grep ghi kèm.
> **Quy ước:** `SAFE` = an toàn xóa, chứng minh tĩnh được (0 tham chiếu ở mọi nơi, kể cả test/lazy/string-key). `CẦN XÁC NHẬN` = có yếu tố động hoặc cần quyết định của người quản lý. Risk = rủi ro khi thực hiện đề xuất (Low/Med/High).

---

## PHẦN 1 — RÁC / DƯ THỪA (ứng viên để xóa)

### 1.1. Dead files — 6 file `SAFE` (Low risk)

**Phương pháp:** trích toàn bộ import/re-export specifier trong `src` (gồm barrel `export … from`, dynamic `import()`, lazy import trong `src/app/routes.tsx`), đối chiếu từng basename; sau đó grep tên symbol (`\b<Name>\b`) trên toàn `src` **kể cả `*.test.*`**. Cả 6 file dưới đây chỉ có duy nhất dòng `export function` của chính nó — 0 nơi import, 0 barrel re-export, 0 tham chiếu string, 0 test.

| # | File | Bằng chứng | Ghi chú |
|---|---|---|---|
| 1 | `src/features/master-data/components/CarriersSection.tsx` | grep `\bCarriersSection\b` → 1 hit (dòng định nghĩa) | Bị thay thế bởi `ForwardersCarriersSection.tsx` (file này mới là file được `MasterDataReferenceTabs.tsx:35` import) |
| 2 | `src/features/master-data/components/ForwardersSection.tsx` | grep `\bForwardersSection\b` → 1 hit (dòng định nghĩa; `ForwardersCarriersSection` là tên khác, không match) | Cùng lý do với #1 |
| 3 | `src/features/master-data/components/DetailField.tsx` | grep `\bDetailField\b` → 1 hit (dòng định nghĩa) | Đồng thời là bản trùng lặp thứ 3 của `FieldPair`/`InfoField` (xem Phần 2, nhóm 7) |
| 4 | `src/features/master-data/components/TaxProfilesCell.tsx` | grep `\bTaxProfilesCell\b` → 1 hit (dòng định nghĩa) | |
| 5 | `src/features/quotation-requests/components/RfqFormSummaryTiles.tsx` | grep `\bRfqFormSummaryTiles\b` → 1 hit (dòng định nghĩa) | |
| 6 | `src/shared/components/InfoField.tsx` | grep `\bInfoField\b` → 1 hit (dòng định nghĩa) | Nằm trong `shared/components` (không thuộc diện orphan-exempt `shared/model`) |

> Ghi chú xác minh: 2 vòng kiểm tra độc lập (agent + grep trực tiếp lần hai) cho cùng kết quả. Không có route lazy-load hoặc string-key nào trỏ tới 6 file này.

### 1.2. File lạc chỗ — 1 mục `CẦN XÁC NHẬN` (Low risk)

| File | Bằng chứng | Phân loại |
|---|---|---|
| `frontend/src/shared/components/__tests__/FeatureHeaderShell.test.tsx` (thư mục `frontend/` **lồng bên trong** package frontend) | (1) `diff` với bản thật `src/shared/components/__tests__/FeatureHeaderShell.test.tsx` → **giống hệt từng byte**. (2) Import tương đối `../FeatureHeaderShell` của nó trỏ tới file **không tồn tại** ở vị trí lồng đó. (3) Ngoài scope mọi tooling: `tsconfig.json` `include: ["src"]`, `vitest.config.ts` `include: ['src/**/*.test.{ts,tsx}']` — không bao giờ được compile hay chạy. (4) File **đang được git track** (đã commit nhầm). | `CẦN XÁC NHẬN` — gần như chắc chắn là sản phẩm của một lần edit sai đường dẫn; xếp "cần xác nhận" chỉ vì nó là file test và cần `git rm` (thao tác git). Đề xuất: xóa cả cây `frontend/` lồng. |

### 1.3. Assets — SẠCH

- `public/` chỉ có đúng 1 file: `public/brand/fds_logo.png` — được `index.html` tham chiếu 4 chỗ (dòng 5, 6, 16, 20: favicon, apple-touch-icon, og:image, twitter:image). **Đang dùng.**
- Glob `src/**/*.{svg,png,jpg,jpeg,gif,webp,ico}` → **0 file**. Không có ảnh nhúng trong `src`.

### 1.4. Debug leftovers — SẠCH

- **`console.log` / `console.debug` / `debugger`:** grep toàn `src` → **0 match**.
- **`console.warn` / `console.error`:** chỉ 2 chỗ, đều là error-handling hợp lệ, đề xuất **giữ**:
  - `src/shared/api/contracts/parseContract.ts:13` — cảnh báo khi response lệch contract.
  - `src/shared/lib/errors.ts:7` — `[render-error]` trong error boundary.
- **Code comment-out:** grep pattern JSX/logic bị comment (`^\s*//\s*(<|return|const|import|export|function|if|useState|useEffect)`) → **0 match**.
- **File backup:** find `*.bak`, `*.old`, `*copy*`, `*-backup*`, `*.orig` (loại trừ node_modules/dist) → **0 file thật** (`CopyIconButton.tsx`, `CopyValue.tsx`, `CopyIconButton.test.tsx` match pattern `*copy*` nhưng là component copy-to-clipboard đang được dùng — false positive).
- **TODO/FIXME/HACK:** chỉ 3 comment, đều là marker có chủ đích chờ tích hợp backend thật (không phải TODO cũ bỏ quên) → đề xuất **giữ**, liệt kê để theo dõi:
  - `src/features/purchase-orders/model/poStageConfig.ts:100` — `TODO(real-data)`
  - `src/features/purchase-orders/model/purchaseOrderModel.ts:399` — `TODO(real-data)`
  - `src/features/purchase-orders/components/PoStageBadge.tsx:42` — `TODO(real-data)`
  - (Các hit `TODO`/`XXX` khác là enum value `'TODO'` của task-status và placeholder currency `'XXX'` trong test — là code, không phải comment.)

### 1.5. Dependencies — SẠCH (0 dep thừa)

Toàn bộ **15 runtime deps + 14 devDeps** đều có bằng chứng sử dụng.

Runtime (grep `from '<pkg>'` / `<pkg>/` / `import('<pkg>` trên `src` + `index.html`, số hit):

| Dep | Hits | Dep | Hits |
|---|---|---|---|
| `@mantine/core` | 168 | `dayjs` | 9 |
| `react` | 134 | `react-dom` | 9 |
| `@tabler/icons-react` | 116 | `zustand` | 6 |
| `@tanstack/react-query` | 57 | `@mantine/dates` | 2 |
| `react-router-dom` | 30 | `zod` | 2 |
| `@mantine/form` | 16 | `axios` | 1 (`axiosConfig.ts`) |
| `@mantine/hooks` | 11 | `@fontsource-variable/geist` / `geist-mono` | 1 + 1 (`main.tsx`) |

DevDeps: `@vitejs/plugin-react` (`vite.config.ts:4,32`), `vite`/`vitest` (configs + scripts), `jsdom` (`vitest.config.ts:16`), `@types/node` (`node:url` trong vite/vitest config), `@types/react`, `@types/react-dom` (`tsconfig.json` `types`), `eslint` + `typescript` (scripts), `typescript-eslint` + `eslint-plugin-jsx-a11y` + `eslint-plugin-react-hooks` + `globals` (`eslint.config.js`), `dependency-cruiser` (`dependency-cruiser.cjs` + script `check:boundaries`). **Không xóa dep nào.**

---

## PHẦN 2 — COMPONENT DÙNG CHUNG BỊ LẶP

Xếp theo ưu tiên (số bản copy × số dòng × độ dễ tách). Mỗi nhóm ghi rõ shared component **đã tồn tại** hay chưa.

### 2.1. ⭐ P1 — Local re-definition của `Metric` card (Low risk, dễ nhất, làm trước)

Shared component **đã tồn tại**: `src/shared/components/Metric.tsx`, đang được 5 features dùng (`tasks/page.tsx:12`, `delivery-orders/components/DeliveryOrderListView.tsx:29`, `purchase-orders/components/PurchaseOrderListView.tsx:35`, `shipments/page.tsx:19`, `domestic-transport-orders/page.tsx:25`).

Nhưng **2 feature tự định nghĩa lại** `function Metric` local với markup gần y hệt (`Paper.metric-card … kbfe-surface-wash kbfe-surface-wash--emphasis` + `metric-label` + `metric-icon-{color}`):

- `src/features/quotations/components/QuotationListView.tsx:321-354` (+ map màu local `metricStatusColorTokens` dòng 314-319)
- `src/features/quotation-requests/components/QuotationRequestListView.tsx:276-295` (byte-for-byte cùng shape)

**Đề xuất:** xóa 2 bản local, dùng `@shared/components/Metric` (thêm prop `className` pass-through nếu cần variant `rfq-metric-card`).

### 2.2. P1 — Map `statusColorTokens` (color name → CSS var `--kbfe-status-*`) lặp 3 nơi (Low risk)

- `src/features/purchase-orders/components/PoStageBadge.tsx:17-26` — map 8 entry
- `src/features/purchase-orders/components/PoStageFilter.tsx:18-27` — **map y hệt** + helper `colorVar()` (29-31)
- `src/features/quotations/components/QuotationListView.tsx:314-319` — subset của cùng map

Chưa có shared tương đương (`StatusBadge.tsx` chỉ map *status → color name*, bước *color name → CSS var* đang bị lặp).

**Đề xuất:** helper `statusColorVar(colorName)` / `STATUS_COLOR_VARS` đặt cạnh `src/shared/components/StatusBadge.tsx`.

### 2.3. ⭐ P1 — "Detail hero" body copy-paste ở 7 detail view (Med risk, win LOC lớn nhất)

Mọi màn detail đều render cùng cấu trúc hero: `Paper.feature-detail-hero` → `.feature-hero-layout` → khối identity (`.feature-hero-icon` + `Title` bọc `CopyValue` + status badge) → `<dl className="feature-hero-facts">` → `Group.feature-hero-actions`. Cùng một CSS-class contract (`feature-detail-hero`, `feature-hero-layout`, `feature-hero-identity`, `feature-hero-icon`, `feature-hero-facts`, `feature-hero-fact`, `feature-hero-actions`).

Các bản near-copy:

| File | Dòng | Ghi chú |
|---|---|---|
| `src/features/quotation-requests/components/RfqDetailHero.tsx` | 21-66 | |
| `src/features/shipments/components/ShipmentDetailView.tsx` | 70-101 | |
| `src/features/delivery-orders/components/DeliveryOrderDetail.tsx` | 137-205 | |
| `src/features/purchase-orders/components/PurchaseOrderDetailPanel.tsx` | 103-179 | |
| `src/features/quotations/components/QuotationDetail.tsx` | 459-519 | |
| `src/features/domestic-transport-orders/components/DomesticTransportOrderDetail.tsx` | 155-177 | **Không bọc `FeatureHeaderShell`** — lệch chuẩn |
| `src/features/tasks/components/TaskDetail.tsx` | ~32 | Cũng bỏ qua `FeatureHeaderShell` |

Đã shared **một phần**: `src/shared/components/FeatureHeaderShell.tsx` chỉ lo chrome ngoài (nút back); phần hero-body bên trong thì copy-paste cả 7 nơi.

**Đề xuất:** component `DetailHero` trong `src/shared/components/` với slot props `{ icon, title, badges, facts: {label,value}[], actions }`, render bên trong `FeatureHeaderShell`; migrate 7 view. **Risk Med** — phải bảo toàn CSS-class contract `feature-hero-*` (CSS ở `src/styles/feature-heroes.css`, `surface-system.css`); DTO/Task có rail riêng nên chỉ dùng slot identity+facts.

### 2.4. P2 — `FilterToolbar` shared chỉ được 1/6 list view dùng (Med risk)

Shared **đã tồn tại**: `src/shared/components/FilterToolbar.tsx` (đóng gói `dl-filter-panel` + `dl-filter-head` + `FilterSegment` + count `common.shown` + slot `children`). Hiện chỉ `shipments/components/ShipmentListView.tsx:125-243` dùng.

5 nơi hand-roll lại đúng cấu trúc đó (`dl-filter-panel` + `dl-filter-head` + `dl-filter-head__control` + `dl-filter-result`):

- `src/features/quotations/components/QuotationListView.tsx:90-111`
- `src/features/quotation-requests/components/QuotationRequestListView.tsx:156-158`
- `src/features/purchase-orders/components/PurchaseOrderListView.tsx:135-139`
- `src/features/delivery-orders/components/DeliveryOrderListView.tsx:111-114`
- `src/features/tasks/components/TasksFilterPanel.tsx:80-83`
- (`domestic-transport-orders/page.tsx:275` và `master-data/components/MasterDataToolbar.tsx:49` chỉ tái dùng class `dl-filter-panel` — không tính.)

**Đề xuất:** migrate 5 panel lên `FilterToolbar` (đã hỗ trợ `isFetching` + slot filter-row). **Risk Med** — mỗi nơi có filter-row hơi khác; phần header segment/count là phần share an toàn.

### 2.5. P2 — Number formatting ad-hoc ở ~15 file, locale không nhất quán (Low-Med risk)

`src/shared/utils/money.ts` đã centralize tiền tệ (`formatMoney`, `formatUnitPrice`), `src/shared/utils/date.ts` lo ngày — nhưng **không có formatter số thường/integer dùng chung**, nên mỗi nơi tự tạo `Intl.NumberFormat` / `toLocaleString` với locale lung tung (chỗ `'en-US'`, chỗ `'vi-VN'`, chỗ bỏ trống):

- `quotations/components/QuotationListView.tsx:72,78,84` — `new Intl.NumberFormat('en-US')`
- `quotation-requests/components/QuotationRequestListView.tsx:289` — `new Intl.NumberFormat()`
- `quotations/components/QuotationFeeTable.tsx:54`, `QuotationForm.tsx:600`, `QuotationChargeBreakdown.tsx:323`, `RfqQuotationPickerModal.tsx:91` — mỗi file tự dựng formatter
- `purchase-orders/components/PoLinesTable.tsx:350-362` — formatter compact-notation tự viết
- `domestic-transport-orders/model/domesticTransportOrderModel.ts:82`, `purchase-orders/components/LotCard.tsx:49`, `shipments/components/CustomsLineDrawer.tsx:57` — `.toLocaleString()`

**Đề xuất:** `formatNumber` / `formatInteger` / `formatCompact` trong `src/shared/utils/` (tái dùng cơ chế `activeLocale`/`setMoneyLocale` sẵn có của money.ts để grouping nhất quán với tiền). **Risk Low-Med** — có thay đổi hành vi: thống nhất locale (hiện đang lệch nhau, coi như sửa bug).

### 2.6. P3 — Helper "value + suffix" / format cân nặng trùng lặp (Low risk)

Helper y hệt nhau (`value == null ? '-' : \`${value.toLocaleString()} ${suffix}\``):

- `src/features/shipments/components/CreateDtoFromShipmentPanel.tsx:48`
- `src/features/shipments/components/ShipmentContainersPanel.tsx:63`

Format kg tự viết lại: `purchase-orders/model/purchaseOrderModel.ts:434-436` (`formatWeightKg`), inline tại `delivery-orders/components/DeliveryOrderDetail.tsx:233`, `quotation-requests/hooks/useQuotationRequestForm.ts:87-92`.

**Đề xuất:** `formatWithUnit(value, unit)` / `formatWeightKg` trong `src/shared/utils/`.

### 2.7. P3 — 3 biến thể component "label + value" (Low risk)

- `src/shared/components/FieldPair.tsx` — shared, đang dùng ở QuotationDetail, RfqOverviewPanel, TaskFormPanel, PurchaseOrderDetailPanel, shipments/page.
- `src/shared/components/InfoField.tsx` — **dead** (Phần 1.1 mục 6) → xóa.
- `src/features/master-data/components/DetailField.tsx` — **dead** (Phần 1.1 mục 3) → xóa.

**Đề xuất:** xóa 2 bản dead, chuẩn hóa về `FieldPair` cho nhu cầu mới.

### 2.8. P3 — `AttachmentList` shared không được shipments tái dùng (Low risk, có lý do)

`src/shared/components/documents/` đã có `DocumentCard`, `DocumentStatusBadge`, `AttachmentList`; `delivery-orders/components/DocumentUploadPanel.tsx:14,120-125,176-181` dùng đủ bộ. Riêng `shipments/components/ShipmentDocumentsPanel.tsx:106-131` tự render file-row inline. Lý do khách quan: row của shipments có flow approve/reject mà `AttachmentList` chưa model. **Đề xuất:** chỉ hợp nhất nếu mở rộng `AttachmentList` nhận slot actions; không bắt buộc.

### Không flag (đúng thiết kế)

- Per-feature Zustand store (`*UiStore.ts`) — by design.
- `rfqStatusColor` (`quotation-requests/model/quotationRequestModel.ts:29`) — delegate đúng chuẩn về shared `getStatusBadgeConfig`.
- Các map màu 3-giá-trị đặc thù domain (`channelColor`, `ShipmentContainersPanel.statusColor`, `getStatusColor`, `marginColor`) — local hợp lý, centralize không đáng.

---

## PHẦN 3 — FILE QUÁ DÀI / KHÓ MAINTAIN

### 3.1. Hai "god-module" logistics — pain cao nhất toàn codebase

#### `src/shared/api/logistics.ts` — 1.900 dòng, được **40 file** import (High risk khi tách, ưu tiên chiến lược)

Không phải danh sách endpoint phẳng mà là **legacy facade + mapping layer** ôm 4 trách nhiệm:

| Section | Dòng | Nội dung |
|---|---|---|
| Type re-export barrel | 1–152 | Re-export ~50 domain type từ `@shared/model/logistics` — 40 file downstream import type *xuyên qua* file này |
| Payload/DTO types | 154–553 | ~40 type `Create*/Update*Payload` (`CreatePurchaseOrderPayload`, `UpdateCustomsPayload`, `SlaAlert`…) |
| Mapper V1→UI | 555–1367 | ~45 pure function (`mapV1PurchaseOrder`:637, `mapV1DeliveryOrder`:1020, `mapV1Shipment`:1191, `mapV1Quotation`:791, `buildUiShipment`:1231…) + các async resolver (`resolveDeliveryOrderId`, `resolveSupplierId`…) — **domain logic thật nằm trong shared/api** |
| Endpoint wrappers | 1369–1900 | ~55 function delegate sang module per-domain mới (`fetchShipments`:1373 → `fetchShipmentsV1` + map; `fetchDeliveryOrders`:1473 → `fetchDeliveryOrdersV1`). Một số là **UI-only stub** trả `uiOnlySuccess`/`emptyDashboardStats`, không nối backend nào: `fetchEfmsControl`:1657, `fetchCharges`:1710, `fetchCustoms`:1734, `addShipmentCost`:1871, `deleteShipmentCost`:1885 |

Nó bọc chính các module per-domain đã tồn tại (`./deliveryOrders`, `./shipments`, `./purchaseOrders`, `./quotations`, `./tradeMasterData` — import ở dòng 51–96), tức là **tầng aggregate cũ** adapt DTO V1 sang UI domain model cũ trong `model/logistics.ts`.

**Đề xuất tách (làm từng domain một, mỗi lần 1 PR, giữ barrel `logistics.ts` teo dần để không phải sửa 40 importer cùng lúc):**
- `src/shared/api/mappers/purchaseOrderMappers.ts` — `mapV1PurchaseOrder*`, `inferPoFlowTags`, `buildUiPurchaseOrder`
- `src/shared/api/mappers/deliveryOrderMappers.ts` — `mapV1DeliveryOrder`, `mapDeliverySourceLine`, `inferShippingMethod`, resolvers
- `src/shared/api/mappers/shipmentMappers.ts` — `mapV1Shipment*`, `buildUiShipment`, `normalizeShipmentMode`
- `src/shared/api/mappers/quotationMappers.ts` — `mapV1Quotation`, `buildQuotationChargeLines`, `quotationStatusToUi`
- `src/shared/api/mappers/taskMappers.ts` — `mapTaskScreen*`, `gd1StatusToTaskScreen`
- Wrapper `fetch*/create*/update*` mỏng dồn về module domain tương ứng; UI-only stubs: xóa hoặc gom vào `logisticsUiStubs.ts` đặt tên rõ ràng.

**Risk: High** — trộn async wiring + pure mapper + dead stub; cần viết unit test cho mapper **trước khi** tách (hiện chưa có).

#### `src/shared/model/logistics.ts` — 907 dòng, chứa 2 thế hệ type song song (Low-Med risk)

File pure type/const (được phép dài — là vocabulary chung, orphan-exempt), nhưng:

- Dòng 1–553: UI domain model hiện hành (`PurchaseOrder`, `DeliveryOrder`, `Quotation`, `ShipmentRecord`, `LogisticsTask` + ~20 enum/union).
- Dòng 556–812 (~256 dòng): khối **`Gd1*`** — trong đó các type PR/approval-matrix (`Gd1PurchaseRequest`, `Gd1PurchaseOrder`, `Gd1PurchaseRequestLine`, `Gd1ApprovalMatrixConfig`, `Gd1PoTaskTemplate`) **không có consumer nào ngoài** chính `model/logistics.ts` + `api/logistics.ts`. PR không nằm trong flow hiện hành `PO → DO → Shipment → DTO` (AGENTS.md) → dead weight. Chỉ subset còn sống qua re-export: `Gd1PoStageTask`, `Gd1ShipmentMilestone/Cost`, `Gd1PoStatus`, `Gd1MilestoneCode`.

**Đề xuất:** (a) prune hoặc quarantine các `Gd1*` PR/approval type không dùng (~250 dòng) — `CẦN XÁC NHẬN` vì có thể là scope tương lai; (b) tách file theo domain (`model/purchaseOrder.ts`, `deliveryOrder.ts`, `shipment.ts`, `quotation.ts`, `task.ts`, `common.ts`) sau một barrel `model/logistics.ts` — cơ học, Low risk.

### 3.2. Fat pages / fat components — bảng xếp hạng theo pain

| File | Dòng | Vấn đề | Đề xuất tách | Pain | Risk |
|---|---|---|---|---|---|
| `src/features/shipments/page.tsx` | 577 | **Fat page nặng nhất**: 17 useState, 11 query, 6 mutation, client-side filtering (149-196), nguyên form "create shipment" inline (400-526, 14 field state) — vi phạm rõ chuẩn "page.tsx thin orchestrator" | Tách `components/CreateShipmentPanel.tsx`; `hooks/useShipmentMutations.ts`; chuyển `filteredShipments`/`tabCounts` vào `model/shipmentModel` | High | Med |
| `src/features/quotations/components/QuotationForm.tsx` | 621 | 1 component 536 dòng: fetch master-data (2 query inline 134-144), draft-option state, ~15 charge-line mutator inline | `hooks/useQuotationFormData.ts`; `components/QuotationOptionDraftCard.tsx` (lưu ý `QuotationOptionEditor.tsx` đã tồn tại — cần đối chiếu tránh tạo bản lặp mới) | High | **High** (charge math) |
| `src/features/quotations/components/QuotationDetail.tsx` | 729 | 8 query + nhiều unit trong 1 file (`CompareDeltaPill`:107, `CompareMetric`:127, `QuotationOptionComparePanel`:159) | Tách cụm compare (83-159 + panel) ra `components/QuotationOptionComparePanel.tsx` | Med-High | Low (JSX thuần) |
| `src/features/delivery-orders/components/DeliveryOrderDetail.tsx` | 673 | 1 component 590 dòng với 5 `Tabs.Panel` (overview 297, ops + gate/risk inline 393-535, documents, tasks 541-587, source-lines) | Tách per-tab: `DeliveryOrderOverviewTab/OpsTab/TasksTab.tsx` | Med-High | Low (JSX thuần) |
| `src/features/domestic-transport-orders/components/DomesticTransportOrderDetail.tsx` | 642 | Presentational, 3 tab; form dispatch nằm inline (355-469) | Tách `DtoDispatchForm.tsx`, `DtoOverviewTab.tsx`; đưa inner cards ra file riêng | Med | Low |
| `src/features/domestic-transport-orders/page.tsx` | 421 | 9 useState, **6 useEffect**, 8 query — effects sync form state lẽ ra thuộc component form | Dồn state+effects dispatch vào `DtoDispatchForm.tsx`; `hooks/useDtoMutations.ts` | Med-High | Med (6 effects) |
| `src/features/shipments/components/CreateDtoFromShipmentPanel.tsx` | 495 | 14 useState (78-90), 5 query, 3 effect: chọn container + builder container mới + form vendor/warehouse trong 1 panel | Tách `ContainerDraftForm.tsx`; hook `useCreateDtoDraft` cho 14 state | High | Med |
| `src/shared/components/AppShellLayout.tsx` | 596 | Shell + `MobileQuickActions` định nghĩa in-file (dòng 360) — 2 unit/file | Tách `MobileQuickActions.tsx`; đưa nav-item config sang `shared/navigation/` | Med | Low-Med |
| `src/entities/logistics/ui/UpdateOrderForms.tsx` | 474 | **2 exported form components / 1 file** (`UpdateDeliveryOrderForm`:42 + `UpdateTaskProgressForm`:314), 3 useForm, 5 query | Tách 2 file; validators (`requiredField`/`positiveNumber` 463-471) → `entities/logistics/lib/` | Med | Med |
| `src/features/master-data/components/ForwardersCarriersSection.tsx` | 457 | CRUD forwarders + carriers gộp 1 file | Tách `ForwardersSection.tsx` / `CarriersSection.tsx` **mới** (2 file dead cùng tên ở Phần 1.1 xóa trước để tránh nhầm), share `useMasterDataCrud` (đã có) | Med | Low-Med |
| `src/features/settings/page.tsx` | 554 | Fat page: users table + modal tạo user + preferences tabs; feature không có `model/` | Tách `components/UserManagementPanel.tsx`, `components/CreateUserModal.tsx` | Med | Low-Med |
| `src/features/profile/page.tsx` | 439 | **Feature không có bất kỳ decomposition nào** — 3 form (profile/email/password), 7 state, 4 useForm, avatar upload, tất cả trong page.tsx | Tạo `profile/components/{ProfileForm,EmailForm,PasswordForm,AvatarUpload}.tsx` | Med | Low-Med |
| `src/features/shipments/components/ShipmentDetailView.tsx` | 486 | Presentational nhưng 4 inner card in-file (`ShipmentOverviewCard`, `ShipmentCommandItem`, `ShipmentProgressTile`, `ShipmentRouteNode`) | Đưa 4 card ra file riêng trong `components/` | Low-Med | Low |

### 3.3. Dài nhưng HỢP LỆ — không đụng

| File | Dòng | Lý do |
|---|---|---|
| `src/shared/i18n/messages/*` (shipments 645, masterData 535, quotations 433, purchaseOrders 373, quotationRequests 371) + `labels.ts` 430 | — | Message map phẳng — dài là bình thường |
| `src/shared/api/{tradeMasterData,quotations,purchaseOrders,shipments,deliveryOrders}.ts` (472/468/450/428/334) | — | Typed V1 DTO + endpoint function — đúng pattern chủ đích |
| `src/features/purchase-orders/model/purchaseOrderModel.ts` | 437 | Model file mẫu mực: pure selectors/types/constants |
| `src/features/master-data/components/referenceColumns.tsx` | 719 | 13 factory `build*Columns` — cohesive; chỉ tách nếu tiếp tục phình |
| `src/features/master-data/components/MasterDataReferenceTabs.tsx` | 478 | Thuần wiring 10 tab, không state |
| `src/shared/preferences/WorkspacePreferencesContext.tsx` | 394 | Context tập trung — chấp nhận được |

---

## PHẦN 4 — ĐỀ XUẤT STRUCTURE

**Kết luận tổng thể: cấu trúc FSD hiện tại LÀNH MẠNH — không cần rewrite.** Layering `app → features → entities → shared` + alias + per-feature `page/components/model/hooks` + per-domain API/i18n/CSS đều đang được tuân thủ và có `dependency-cruiser` cưỡng chế. Vấn đề tập trung ở vài điểm, không hệ thống. Các đề xuất dưới đây là **gợi ý kèm trade-off, không áp đặt** — chỉ nên làm khi có kế hoạch refactor chủ động:

1. **(Giá trị cao nhất, Med-High risk)** Carve mapper V1→UI ra khỏi `shared/api/logistics.ts` (chi tiết Phần 3.1). Đây là smell lớn nhất với AI agent: ~800 dòng domain logic (`inferPoFlowTags`, `inferShippingMethod`…) nằm trong `shared/` — nơi AGENTS.md định nghĩa là "domain-agnostic". Vị trí đích: `shared/api/mappers/*` hoặc `entities/logistics/lib/`. *Trade-off:* 40 importer, phải giữ barrel chuyển tiếp và đi từng domain; cần viết test mapper trước.
2. **(Low risk, payoff rõ)** Prune/quarantine khối `Gd1*` PR/approval types chết (~250 dòng) trong `model/logistics.ts`, rồi tách model per-domain sau barrel. *Trade-off:* nếu PR scope quay lại thì phải khôi phục từ git — chấp nhận được vì git giữ lịch sử; loại bỏ được ambiguity "dùng `PurchaseOrder` của model hay `PurchaseOrderV1`?" vốn rất dễ làm agent chọn sai type.
3. **(Low-Med risk)** Bổ sung `hooks/` cho các feature đang thiếu **đúng lúc** tách fat page (Phần 3.2): quotations, shipments, delivery-orders, domestic-transport-orders. Việc thiếu `hooks/` không phải lỗi cấu trúc mà là triệu chứng của under-decomposition — sửa cùng lúc, không sửa riêng.
4. **(Low risk)** Decompose 2 feature "phẳng hoàn toàn": `profile/` (chỉ có page.tsx) và `settings/` (thiếu `model/`) — đưa về đúng chuẩn feature-folder. *Trade-off:* gần như không có; chỉ là công.

**Không đề xuất** thay đổi: `entities/logistics` (kỷ luật tốt, trừ việc `UpdateOrderForms.tsx` chứa 2 component — đã liệt kê ở 3.2), i18n messages, per-domain API modules, cơ chế CSS domain-file + `dl-*`.

---

## TỔNG HỢP ƯU TIÊN

| Ưu tiên | Hành động | Risk | Phân loại |
|---|---|---|---|
| **P1** | Xóa 6 dead files (1.1) | Low | `SAFE` |
| **P1** | Xóa cây `frontend/` lồng sai chứa test trùng (1.2) | Low | `CẦN XÁC NHẬN` |
| **P1** | Bỏ 2 local `Metric`, dùng shared (2.1); helper `statusColorVar` (2.2) | Low | Refactor nhỏ |
| **P2** | Tách `DetailHero` shared, migrate 7 detail view (2.3) | Med | Refactor |
| **P2** | Migrate 5 filter panel lên `FilterToolbar` (2.4); `formatNumber` shared (2.5) | Med / Low-Med | Refactor |
| **P2** | Tách các fat page risk thấp trước: `QuotationDetail`, `DeliveryOrderDetail`, `ShipmentDetailView`, `profile/page`, `settings/page`, `AppShellLayout` (3.2) | Low → Low-Med | Refactor |
| **P3** | Prune `Gd1*` dead types + tách `model/logistics.ts` per-domain (3.1b, 4.2) | Low | `CẦN XÁC NHẬN` (scope tương lai?) |
| **P3** | Carve mappers khỏi `api/logistics.ts` từng domain, viết test mapper trước (3.1a, 4.1) | High | Refactor chiến lược |
| **P3** | `shipments/page.tsx`, `QuotationForm.tsx`, `CreateDtoFromShipmentPanel.tsx`, DTO page/detail (3.2) | Med-High | Refactor |
| **P3** | `formatWithUnit` (2.6); mở rộng `AttachmentList` (2.8) | Low | Tùy chọn |

### Mục chờ xác nhận của người quản lý dự án

1. Cây `frontend/` lồng sai (1.2) — xóa cả thư mục (`git rm`)?
2. Khối `Gd1*` PR/approval types (~250 dòng) — xóa hẳn hay quarantine vào `model/gd1Draft.ts`? (PR scope có kế hoạch quay lại không?)
3. UI-only stubs trong `api/logistics.ts` (`fetchEfmsControl`, `fetchCharges`, `fetchCustoms`, `addShipmentCost`, `deleteShipmentCost`) — có màn hình nào sắp cần chúng nối backend thật không, hay xóa/gom stub?
4. 3 comment `TODO(real-data)` — xác nhận giữ làm marker tích hợp backend.

> **Bước tiếp theo:** chưa thực hiện thay đổi nào. Chờ duyệt danh sách trên; khi duyệt, khuyến nghị thực hiện theo thứ tự P1 → P2 → P3, mỗi cụm một commit riêng, chạy `npm run verify` sau mỗi cụm.
