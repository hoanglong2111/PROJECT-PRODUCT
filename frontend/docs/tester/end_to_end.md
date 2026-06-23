# Kịch bản Test Flow nghiệp vụ — KBFE (PO → DTO → Task)

> **Phiên bản:** 2.0 | **Cập nhật:** 2026-06-19
> **URL:** `http://localhost:5173` · Khởi động: `npm run dev`
> **Mục tiêu:** test xuyên suốt để hiểu luồng **PO → DO → Quotation → Shipment → Customs
> → Carrier DO → DTO → Task**. (Các module nền Auth / Dashboard / Master Data / Profile /
> Settings không nằm trong phạm vi tài liệu này.)
>
> **Lưu ý môi trường:** kịch bản chạy trên *dev backend hiện tại (mock API)*. Các seed ID
> (vd `do_006`/`do_003`) và lệnh `mock:seed` là **đặc thù mock-data**, sẽ khác khi đổi
> sang backend thật — bản thân luồng nghiệp vụ thì không phụ thuộc backend.

---

## 0. Chuẩn bị nhanh

| Hạng mục | Nội dung |
|---|---|
| Đăng nhập | `admin@kbfe.local` / `admin123` (email chứa "admin" → role ADMIN, toàn quyền) |
| Reset dữ liệu | `npm run mock:seed` ở `kbi-mock-api` để về dữ liệu seed chuẩn (thao tác UI có ghi vào mock-data) |
| Luồng chính | `PO → LOT → DO → Quotation → Shipment → Customs → Carrier DO → DTO → Close`, kèm `Task` chạy song song theo từng stage |
| Quy ước | Mỗi case có **Precondition / Steps / Expected / Status**. Tester điền `PASS`/`FAIL`/`SKIP` vào **Status** |

> **Gợi ý:** nếu chỉ muốn xem nhanh luồng end-to-end, làm thẳng **mục 9 (Golden Path)**.
> Các mục 1–8 là test chi tiết từng chặng.

---

## 1. Purchase Order (PO)

### PO-01: Tạo PO mới (Incoterm bắt buộc)

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đăng nhập ADMIN, vào `Purchase Orders` |
| **Steps** | 1. Nhấn **Create PO**<br>2. Header: PO Number, **Supplier** (chọn supplier sẽ tự điền Currency/Incoterm/Transport mode/Payment term mặc định), PO Type, Currency, **Incoterm**, Transport mode, ETD/ETA<br>3. Thêm ≥ 1 line: Item, HS code/customs profile, Qty, Unit price, Gross weight<br>4. Nhấn **Save** |
| **Expected** | - PO tạo với status `DRAFT`, total = Σ(qty × unit_price)<br>- **Save bị chặn** nếu thiếu PO Number, Supplier **hoặc Incoterm** (3 field bắt buộc)<br>- Incoterm quyết định bộ field phí ở form báo giá downstream (xem mục 3) |
| **Status** | |

### PO-02: Gửi PO & xác nhận NCC (DRAFT → SENT → CONFIRMED)

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | PO `DRAFT` có line hợp lệ |
| **Steps** | 1. Mở PO detail → **Send** (DRAFT → SENT)<br>2. **Supplier Confirmation** → nhập cargo ready date, confirmed qty, can fulfill → Submit |
| **Expected** | - SENT → CONFIRMED<br>- Hệ thống ghi nhận NCC giao đủ/một phần làm cơ sở chia LOT |
| **Status** | |

### PO-03: Lot Planning (chia/tách/gộp lô)

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | PO ≥ CONFIRMED, có line items |
| **Steps** | 1. Mở tab **Lot Planning** → thấy LOT-001 mặc định chứa line<br>2. Tạo **LOT-002**<br>3. **Split** một line: tách 1 phần qty sang LOT-002<br>4. **Move** một line sang LOT khác |
| **Expected** | - Split: qty LOT nguồn giảm, LOT đích tăng, tổng qty_lotted không đổi<br>- Split không hợp lệ (0, ≥ qty nguồn) bị từ chối<br>- LOT đã `ASSIGNED_TO_SHIPMENT`/`SHIPPED`/`CANCELLED` bị khoá — không move/split/delete |
| **Status** | |

### PO-04: Tạo Internal DO từ LOT

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | PO có LOT mở, có line items |
| **Steps** | 1. Trong Lot Planning, tick chọn 1 hoặc nhiều LOT<br>2. Nhấn **Create Internal DO** (gọi `POST /api/v1/delivery-orders/from-lots`) |
| **Expected** | - DO mới tạo, copy LOT lines thành DO lines (giữ liên kết PO/LOT/PO line/Item/HS/Qty/Weight)<br>- Frontend tự mở màn **Delivery Orders** để xem DO mới |
| **Status** | |

---

## 2. Delivery Order (DO)

### DO-01: Danh sách & tab trạng thái

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có DO trong hệ thống |
| **Steps** | 1. Vào **Delivery Orders**<br>2. Duyệt các tab nhóm trạng thái (Chờ xử lý, Chờ bàn giao, Đang chờ thông quan, Đã thông quan, Hoàn tất, Sự cố, Tất cả) |
| **Expected** | - Mỗi tab chỉ hiển thị DO đúng nhóm trạng thái, badge đếm đúng<br>- Cột: `Lô hàng` (DO + LOT no), Source PO LOT, Allocation (item/PCS/weight/cont), Tuyến, Shipment liên kết/ETA, Status |
| **Status** | |

### DO-02: DO detail & primary action

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Mở 1 DO detail |
| **Steps** | 1. Xem các tab: Overview, Quotations, Ops, Documents, Tasks, Source lines<br>2. Quan sát nút primary ở header |
| **Expected** | - Nút primary đổi theo trạng thái: `DRAFT` → **Ready for quotation**; `ASSIGNED_TO_SHIPMENT` → **Close DO**; luôn có **Cancel**<br>- KHÔNG có nút "Assign to Shipment"/"Confirm quotation" riêng — việc chốt báo giá làm ở tab **Quotations** (action Mark final, xem QT-04)<br>- `Source lines` cho thấy liên kết DO line ← PO/LOT/Item/Shipment/Container |
| **Status** | |

---

## 3. Quotation (trong tab Quotations của DO)

> Form báo giá đi qua **một modal** ("Create quote"), **tự render field phí theo Incoterm
> của PO** (read-only từ DO) **× Shipping mode** — không nhập charge-type thủ công.

### QT-01: Field phí thay đổi theo Incoterm (trọng tâm)

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | DO từ PO ở các Incoterm khác nhau (seed: EXW/FCA → `do_006`; FOB → `do_003`; CFR → `do_001`) |
| **Steps** | 1. Mở DO → tab **Quotations** → **+ Create quote** trên từng DO, quan sát các section phí |
| **Expected** | - Modal hiển thị read-only `Incoterms (from DO)` + `Charge group`<br>- **EXW/FCA:** Origin + Intl freight + VN local + Customs/Transport (đủ 4 nhóm)<br>- **FOB:** bỏ Origin<br>- **CFR:** bỏ Origin và Intl freight |
| **Status** | |

### QT-02: Field phí thay đổi theo Shipping mode

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đang ở "Create quote" của 1 DO nhóm EXW/FCA |
| **Steps** | 1. Đổi Shipping mode FCL → LCL → AIR |
| **Expected** | - **FCL:** thêm `EMC/EMF` + `CLEANING` (VN local) và `Hạ xa` (Customs)<br>- **LCL:** có `CFS` nằm **giữa** `THC` và `CIC`; không `Hạ xa`<br>- **AIR:** VN local chỉ `Handling fee`; Customs thêm `Phí bốc xếp xuống pallet` |
| **Status** | |

### QT-03: Nhập phí & tạo báo giá

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Đang ở "Create quote" modal |
| **Steps** | 1. Chọn Carrier (forwarder)<br>2. Nhập vài ô phí → xem **Computed total**<br>3. Nhấn **Create quote** |
| **Expected** | - Nút **Create quote** disabled khi chưa chọn Carrier hoặc total ≤ 0<br>- Computed total = tổng các ô phí (cùng currency)<br>- Quote mới `DRAFT` xuất hiện trong bảng kèm charge breakdown |
| **Status** | |

### QT-04: Actions Send / Mark final / Reject + Compare

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có ≥ 1 quote (Compare cần ≥ 2) |
| **Steps** | 1. Quote `DRAFT` → **Send**<br>2. Quote `PRELIMINARY_SENT` → **Mark final** hoặc **Reject**<br>3. Tick 2 quote → **Compare** |
| **Expected** | - Send → `PRELIMINARY_SENT` (hiện SLA timer)<br>- Mark final → quote Final, DO chuyển bước tiếp (sẵn sàng gắn shipment)<br>- Reject → `REJECTED`<br>- Compare chỉ bật khi chọn đúng 2 quote, hiển thị bảng so sánh cạnh nhau |
| **Status** | |

---

## 4. Shipment

### SH-01: Tạo Shipment từ DO

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | DO đã có quote **Mark final** |
| **Steps** | 1. Tạo Shipment từ DO → nhập mode, carrier, vessel/voyage, B/L hoặc AWB, container(s), POL/POD, ETD/ETA |
| **Expected** | - Shipment tạo thành công, lines kế thừa từ DO, khởi tạo **10 milestones** |
| **Status** | |

### SH-02: Milestones & Documents

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Shipment vừa tạo |
| **Steps** | 1. Tab **Milestones**: đánh dấu lần lượt BOOKING_CONFIRMED → CARGO_READY → PICKED_UP → BL_ISSUED → GATE_IN_POL → ATD → CUSTOMS_DRAFT → ARRIVAL_NOTICE → CUSTOMS_CLEARED → DELIVERED (nhập actual date)<br>2. Tab **Documents**: upload Commercial invoice/Packing list/BL → Verify |
| **Expected** | - Phải đánh dấu theo thứ tự (không nhảy cóc); status shipment cập nhật theo milestone<br>- Document upload + Verify/Reject hoạt động; thiếu chứng từ → ảnh hưởng gate |
| **Status** | |

---

## 5. Customs Clearance (trong Shipment detail)

### CD-01: Tạo & xử lý tờ khai

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Shipment đã tới mốc cho phép khai (≥ CUSTOMS_DRAFT) |
| **Steps** | 1. Tab **Customs** → **Create declaration** (type IMPORT, chọn broker)<br>2. Kiểm tra/khai customs lines (HS code, trị giá, thuế)<br>3. Workflow: **Open draft → Open official** (chọn **Channel** Xanh/Vàng/Đỏ) **→ Submit → Clear**<br>4. (Vàng/Đỏ) có thêm bước **Inspection** trước Clear |
| **Expected** | - Channel gán lúc Open official và **persist trên shipment** kể cả sau thông quan<br>- Sau Open official: customs lines read-only<br>- Clear → declaration `CLEARED`, shipment → `CUSTOMS_CLEARED`, milestone CUSTOMS_CLEARED done |
| **Status** | |

---

## 6. Carrier DO (trong Shipment detail)

### CDO-01: Tạo & release Carrier DO

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Shipment đã `CUSTOMS_CLEARED` |
| **Steps** | 1. Tab **Carrier DO** → **Create carrier DO** (forwarder, release location, container, ngày phát hành/hết hạn, local charge)<br>2. **Issue** → **Release** |
| **Expected** | - CDO tạo `PENDING` → Issue `ISSUED` → Release `RELEASED`<br>- Nút Create chỉ bật khi shipment `CUSTOMS_CLEARED` |
| **Status** | |

---

## 7. Domestic Transport Order (DTO)

> DTO tạo qua **một modal chung có chọn container + kiểm tra POD**, mở từ **danh sách
> Shipments** hoặc màn **Domestic Transport Orders**. Tab DTOs trong Shipment detail là
> **chỉ-xem + Unlink**. Quan hệ Shipment ↔ DTO là **n:n** (1 shipment nhiều DTO; 1 DTO
> phục vụ nhiều shipment khi LCL).

### DTO-01: Tạo DTO từ shipment

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Shipment `CUSTOMS_CLEARED` |
| **Steps** | A. Danh sách **Shipments**: tick 1 shipment → **Create DTO**; hoặc<br>B. Màn **Domestic Transport Orders**: ô **Create from shipment** → **Create DTO**.<br>Trong modal: chọn **Containers** (container đã gán DTO khác bị disabled), Truck vendor, Warehouse (mặc định "KBI Main Warehouse"), Scheduled pickup, Note → **Create DTO** |
| **Expected** | - DTO `DRAFT`, tự link shipment, container đã chọn được gán cho DTO<br>- Xe/tài xế/lịch giao cập nhật sau ở DTO detail (không nhập lúc tạo) |
| **Status** | |

### DTO-02: Consolidate nhiều shipment vào 1 DTO (LCL)

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | ≥ 2 shipment đều `CUSTOMS_CLEARED` và **cùng POD** |
| **Steps** | 1. Danh sách **Shipments**: tick ≥ 2 shipment → **Consolidate DTO (N)**<br>2. Modal chọn container từng shipment → **Create consolidated DTO (N)** |
| **Expected** | - Một DTO phục vụ tất cả shipment đã chọn (link n:n)<br>- Khác POD → modal cảnh báo đỏ và **chặn** tạo |
| **Status** | |

### DTO-03: Workflow DTO & Unlink

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | DTO `DRAFT` |
| **Steps** | 1. Màn **Domestic Transport Orders** → mở DTO → các nút: **Quote pending → Confirm quote → Dispatch → Start transit → Deliver** (nhập actual) → nhập **POD document** + Save → **Close**<br>2. Shipment detail → tab **DTOs**: nhấn **✕ Unlink** một DTO |
| **Expected** | - Chuyển trạng thái: DRAFT → QUOTE_PENDING → QUOTE_CONFIRMED → DISPATCHED → IN_TRANSIT → DELIVERED → POD_RECEIVED → CLOSED<br>- Không Dispatch được nếu chưa `QUOTE_CONFIRMED`<br>- Tab DTOs chỉ-xem + Unlink (không có "Tạo DTO"/"Link existing"); Unlink chỉ gỡ liên kết, **không xóa** DTO |
| **Status** | |

---

## 8. Tasks (checklist vận hành theo stage)

### TASK-01: Theo dõi & cập nhật task

| Hạng mục | Nội dung |
|---|---|
| **Precondition** | Có task gắn với PO/DO |
| **Steps** | 1. Vào **Tasks** (hoặc tab Tasks trong DO/PO)<br>2. Lọc theo status/role/stage<br>3. Cập nhật task: TODO → IN_PROGRESS; Block (nhập lý do) → Resume; đổi Priority |
| **Expected** | - Task gom theo stage: SUPPLIER_CONFIRMATION → LOT_PLANNING → INTERNAL_DO → QUOTATION → SHIPMENT → CUSTOMS → CARRIER_DO → DTO<br>- Task quá hạn hiện "Overdue"; task `BLOCKED`/required chưa xong sẽ **chặn Close DO** |
| **Status** | |

---

## 9. Golden Path — chạy xuyên suốt PO → DTO

> Kịch bản end-to-end để hiểu cả luồng. Precondition: ADMIN; có sẵn Master Data
> (Supplier kiêm FORWARDER + CUSTOMS_BROKER + TRUCKING_VENDOR, Currency, Incoterm, Items).

| Bước | Thao tác | Expected |
|---:|---|---|
| 1 | **PO:** Create PO (Supplier, Incoterm=FOB, lines) → Save | PO `DRAFT` |
| 2 | Send → Supplier Confirmation | PO `CONFIRMED` |
| 3 | **Lot Planning:** tạo LOT-002, Split/Move line | 2 LOT có line đúng |
| 4 | **Create Internal DO** từ LOT-001 | DO tạo, copy lines |
| 5 | **DO:** primary **Ready for quotation** | DO sẵn sàng báo giá |
| 6 | **Quotation:** Create quote → thấy field nhóm **FOB**; chọn carrier, nhập phí → Create quote | Quote `DRAFT` kèm breakdown |
| 7 | Trên quote: **Send** → **Mark final** | Quote Final, DO sẵn sàng gắn shipment |
| 8 | **Shipment:** tạo từ DO → đánh dấu milestones tới ATD; upload + Verify documents | Shipment chạy theo milestone |
| 9 | **Customs:** Create declaration → Open draft → Open official (Channel=GREEN) → Submit → Clear; mark milestone CUSTOMS_CLEARED | Shipment `CUSTOMS_CLEARED`, channel=GREEN persist |
| 10 | **Carrier DO:** Create → Issue → Release | CDO `RELEASED` |
| 11 | **DTO:** Shipments list → Create DTO (chọn container) → Quote pending → Confirm quote → Dispatch → Start transit → Deliver → POD → Close | DTO `CLOSED` |
| 12 | **Task:** kiểm tra required task đã COMPLETED → **Close DO** | DO đóng; flow hoàn tất |

**Kết quả cuối:** PO `READY_TO_SHIP` · LOT `SHIPPED` · DO `Closed` · Quotation Final ·
Shipment `DELIVERED` · Customs `CLEARED` · Carrier DO `RELEASED` · DTO `CLOSED`.

---

> **Ghi chú tester:** điền **Status** (`PASS`/`FAIL`/`SKIP`); nếu `FAIL` ghi bug + screenshot.
> Muốn về dữ liệu chuẩn: `npm run mock:seed`.
