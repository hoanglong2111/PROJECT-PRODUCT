# Technical Requirement Summary

Tài liệu này là bản tóm tắt kỹ thuật hiện hành cho frontend GD1 sau khi chốt lại phạm vi nghiệp vụ: hệ thống làm từ PO trở đi, không triển khai PR trong frontend hiện tại.

## 1. Phạm vi hệ thống (In-Scope Phase 1)

GĐ1 tập trung số hóa quy trình Procurement & Import Tracking từ Purchase Order:

```text
PO -> DO -> Shipment -> DTO
```

Quan hệ chuẩn:

```text
Purchase Order 1 -> N Delivery Orders
Delivery Order 1 -> 1 Shipment
Shipment 1 -> 0..1 Domestic Transport Order
```

Trong đó:

- `PO` là điểm bắt đầu hiện tại của frontend.
- `DO` là Delivery Order, đơn vị lập kế hoạch giao/nhận giữa PO và Shipment.
- `Shipment` là hồ sơ vận chuyển import SEA/AIR, tạo từ một DO đã confirm.
- `DTO` là Domestic Transport Order, lệnh vận tải nội địa sau thông quan/giao hàng nội địa. DTO không phải DO.

Out of scope:

- Purchase Request (PR), trừ khi Product Owner mở lại scope.
- Bin/rack WMS, putaway/scanning, và vận hành kho chi tiết.
- BOM, lệnh sản xuất, MRP, và forecast mua hàng.

## 2. Thiết kế dữ liệu (Data Model)

Các entity cốt lõi:

- `purchase_order`, `purchase_order_line`: đơn mua, dòng hàng, version/revision, supplier confirmation, ordered/shipped/received quantity.
- `delivery_order`, `delivery_order_line`: một PO có nhiều DO; mỗi DO chọn PO lines, warehouse/delivery address, lịch giao, quotation versions, selected final quotation, confirmation status.
- `quotation`, `quotation_version`: báo giá FDS nằm trong workflow DO; một DO có thể có v1/v2/v3 nhưng chỉ một final quotation được chọn trước khi confirm DO.
- `shipment`, `shipment_line`: một DO đã confirm tạo đúng một Shipment; shipment line lấy từ DO lines / PO lines.
- `shipment_milestone`: 10 mốc vận chuyển chuẩn.
- `shipment_cost`: chi phí shipment và landed-cost allocation xuống PO line.
- `domestic_transport_order`: lệnh vận tải nội địa sau `CUSTOMS_CLEARED`.
- `po_stage_task`, `po_task_template`: task/SLA theo PO, DO, Shipment milestone, và workflow vận hành.

Chuẩn kỹ thuật:

- Multi-tenant: dữ liệu gắn `tenant_id`.
- Entity transactional dùng UUID, `version` cho optimistic locking, và `deleted_at` cho soft delete khi cần.
- Tiền tệ lưu `amount`, `currency_code`, `exchange_rate`.
- Audit/state log là append-only cho thay đổi quan trọng.

## 3. State Machines & Business Logic

PO lifecycle:

```text
DRAFT -> SENT -> CONFIRMED -> SHIPPED -> RECEIVED -> CLOSED
CANCELLED
```

DO lifecycle:

```text
DRAFT -> CONFIRMED -> READY_TO_SHIP -> IN_TRANSIT -> DELIVERED -> CLOSED
CANCELLED
```

DO workflow:

```text
Create DO
-> Select warehouse / delivery address
-> Create quotation v1
-> Revise quotation if needed
-> Create quotation v2, v3...
-> Select final quotation
-> Confirm DO
-> Proceed to shipment / delivery
```

Shipment 10 milestones:

```text
BOOKING_CONFIRMED -> CARGO_READY -> PICK_UP -> BL_ISSUED -> GATE_IN_POL
-> ATD -> CUSTOM_DRAFT_SUBMITTED -> AN_ATA -> CUSTOM_CLEARED -> EDO_DELIVERY
```

DTO:

- DTO được tạo/kích hoạt khi Shipment đạt `CUSTOMS_CLEARED`.
- DTO quản lý carrier, xe, tài xế, lịch giao, POD, sự cố giao hàng, và giá trucking.

Fuel pricing:

```text
Adjusted price = Original price * (1 + ((Petrol price at delivery - Petrol price at quote) / Petrol price at quote) * 0.36)
```

## 4. API và tích hợp

- REST/OpenAPI style.
- Request tạo mới cần idempotency để tránh double-submit.
- Response nên theo dạng `{ data, meta, errors }`.
- Forwarder/carrier tracking ưu tiên webhook/API, fallback polling 4 giờ, email parsing, SFTP/CSV, hoặc manual update.
- ERP/WMS handoff là integration concern; frontend cần thể hiện trạng thái sync khi có dữ liệu.

## 5. SLA Timer & Task Management

Hệ thống cần hỗ trợ:

- Auto-generated tasks khi PO, DO, Shipment, hoặc milestone đổi trạng thái.
- SLA scan định kỳ, dự kiến 15 phút/lần.
- Overdue notification và escalation theo severity.
- Milestone auto-close task khi milestone có actual date.

SLA chính theo SOP:

- Preliminary response: trong 1 giờ.
- Send quotation: trong 8 giờ.
- Booking sau KBI confirmation: trong 4 giờ.
- Review Draft B/L, CI, PL: trong 2 giờ.
- Debit Note sau Final B/L/AWB: trong 3 giờ.
- Arrival Notice: trước ATA ít nhất 2 ngày.
- Draft customs declaration: trước ETA ít nhất 3 ngày.
- Official declaration: trong 2 giờ sau KBI confirmation.
- Check release: trước ETA ít nhất 2 ngày.
- Final dossier / Final Debit Note: trong 5 ngày sau ATA.

## 6. Non-Functional Requirements

- Performance: dashboard/load chính cần tối ưu cho volume vận hành.
- Security: RBAC, tenant isolation, không leak dữ liệu giữa tenant.
- Audit trail: mọi thay đổi state, document, quotation, task, cost, incident cần truy vết được.

