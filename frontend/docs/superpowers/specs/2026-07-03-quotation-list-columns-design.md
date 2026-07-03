# Bổ sung thông tin cho bảng danh sách báo giá (QuotationListView)

Ngày: 2026-07-03

## Context

Bảng danh sách báo giá tại [QuotationListView.tsx](../../../src/features/quotations/components/QuotationListView.tsx)
hiện hiển thị 6 cột: `Số báo giá (+ hạn hiệu lực text) | Khách hàng | Phương thức (+ incoterm) | Tổng | Trạng thái | Xem`.
Người dùng (sales/logistics) khi lướt danh sách cần nắm nhanh 4 tín hiệu quyết định mà bảng
chưa thể hiện tốt: **báo giá còn hiệu lực không**, **đây là bản sửa lần mấy / đã chốt chưa**,
**ai báo giá (nhà cung cấp)**, và **loại chi phí gì**. Các trường này đã có sẵn trong `QuotationV1`
(`valid_until`, `version`, `is_final`, `supplier`, `quotation_type`) nhưng chưa lên bảng.

Mục tiêu: đưa 4 thông tin này lên bảng mà **không phình cột** (giữ 6 cột để scan nhanh), bằng
cách làm giàu các ô 2 dòng sẵn có và tái dùng pattern badge đã có trong codebase.

## Quyết định đã chốt với người dùng

- Bổ sung cả 4: hiệu lực (nâng cấp), version/FINAL, supplier, quotation_type.
- Giữ **6 cột**, phân bổ thông tin vào 3 ô sẵn có (mỗi ô vốn đã 2 dòng).
- `quotation_type`: badge **rút gọn** trong ô Phương thức, cạnh incoterm, kèm tooltip tên đầy đủ.

## Bố cục mới (giữ nguyên `--rfq-list-columns`, không sửa grid)

```
┌─ SỐ BÁO GIÁ ──────┬─ KHÁCH HÀNG ─┬─ PHƯƠNG THỨC ──┬─ TỔNG ─┬ TRẠNG THÁI ┬ ─
│ QT-2026-0001 ⧉ v2 │ KBI Corp     │ SEA_FCL        │ $12,500│ [CONFIRMED]│👁
│ 🔴 Hết hạn 3 ngày │ NCC: ABC Log │ CIF · [LOCAL]  │        │            │
└───────────────────┴──────────────┴────────────────┴────────┴────────────┴─
```

1. **Ô Số báo giá** ([QuotationListView.tsx:119-131](../../../src/features/quotations/components/QuotationListView.tsx#L119)):
   - Dòng 1: `quotation_no` + `CopyValue` (giữ nguyên) + chip **`v{version}`** khi `version > 1` + badge **`FINAL`** khi `is_final`. Version/FINAL đặt **ngoài** `CopyValue` (chỉ copy `quotation_no`).
   - Dòng 2: thay `<Text>{valid_until}</Text>` bằng component mới **`QuotationValidityBadge`**.

2. **Ô Khách hàng** ([QuotationListView.tsx:133-140](../../../src/features/quotations/components/QuotationListView.tsx#L133)):
   - Dòng 1: `customer_ref` (đậm, như hiện tại).
   - Dòng 2 (mới): `supplier?.supplier_name` màu xám, prefix nhãn ngắn "NCC:" — ẩn nếu không có supplier.

3. **Ô Phương thức** ([QuotationListView.tsx:142-152](../../../src/features/quotations/components/QuotationListView.tsx#L142)):
   - Dòng 1: `mode` (như hiện tại).
   - Dòng 2: `incoterm_code` **·** badge rút gọn `quotation_type` (Tooltip = tên đầy đủ).

4. Money / Status / Action: **không đổi**.

## Component & helper mới

### `QuotationValidityBadge` — `src/features/quotations/components/QuotationValidityBadge.tsx`
Nhân mẫu [DelayBadge.tsx](../../../src/shared/components/DelayBadge.tsx) (cùng phong cách Mantine `Badge` + màu + i18n).
- Props: `validUntil: string | null`.
- Logic: `days = ceil((validUntil - today) / 1 ngày)` theo ngày lịch.
  - `validUntil == null` → `Badge gray light` "Không hạn".
  - `days < 0` → `Badge red` (leftSection `IconAlertTriangle`) "Hết hạn {n} ngày".
  - `days === 0` → `Badge yellow filled` "Hết hạn hôm nay".
  - `0 < days ≤ EXPIRY_SOON_DAYS (=7)` → `Badge orange light` "Còn {n} ngày".
  - `days > 7` → `Badge teal light` "Đến {validUntil}" (hoặc dimmed text nhẹ).
- Đặt `EXPIRY_SOON_DAYS = 7` là hằng số cạnh component.

### Nhãn rút gọn `quotation_type`
Thêm map `quotationTypeShortLabels` (+ full label) vào [quotationModel.ts](../../../src/features/quotations/model/quotationModel.ts):
`FREIGHT→"FREIGHT"`, `LOCAL_CHARGE→"LOCAL"`, `CUSTOMS→"CUSTOMS"`, `TRUCKING→"TRUCK"`, `MIXED→"MIXED"`.
Badge dùng nhãn rút gọn, Tooltip dùng nhãn đầy đủ (i18n).

## i18n (thêm cả `en` và `vi` trong [messages.ts](../../../src/shared/i18n/messages.ts))
- `quotations.version` → `Version` / `Phiên bản` (nếu cần cho tooltip chip)
- `quotations.final` → `Final` / `Chốt`
- `quotations.supplierShort` → `Supplier` / `NCC`
- `quotations.validity.noLimit|expired|expiresToday|expiresIn|validUntilDate`
- `quotations.type.freight|localCharge|customs|trucking|mixed` (tên đầy đủ cho tooltip)

Ưu tiên tái dùng key `delay.*` nếu ngữ nghĩa trùng; nếu khác thì tạo nhánh `quotations.validity.*` riêng để không lệ thuộc `delay`.

## Ràng buộc & lưu ý
- **Không sửa** biến CSS `--rfq-list-columns` ([quotations.css:475](../../../src/styles/quotations.css#L475)) — bố cục nằm gọn trong các ô hiện có; chỉ thêm CSS nhỏ nếu cần khoảng cách badge.
- Mobile ([quotations.css:842](../../../src/styles/quotations.css#L842) `grid-template-areas`): các ô vẫn dùng lại area cũ, thông tin mới đi kèm ô nên không cần đổi mapping; kiểm tra lại hiển thị mobile-label.
- Badge dày lên trong ô hẹp: đặt `size="xs"` / `variant="light"`, `Group gap={4} wrap="nowrap"`, cho phép ellipsis.
- Không đụng `EntityLink`, không thêm dependency, không thêm cột.

## Verification
1. `cd PROJECT-PRODUCT/frontend && npm run typecheck` — sạch (MessageKey mới, props mới).
2. Unit test `QuotationValidityBadge.test.tsx` (Vitest): với các mốc `validUntil` (null / quá khứ / hôm nay / +3 ngày / +30 ngày) → assert đúng nhãn & màu; test dùng ngày cố định (mock `Date`/`now`).
3. `npm run test` + `npm run check:boundaries` (component trong `features/quotations` — không vi phạm ranh giới).
4. `npm run dev` → kiểm thử tay bảng báo giá:
   - Báo giá hết hạn/sắp hết hạn/còn hạn hiển thị badge màu đúng.
   - Bản có `version>1` hiện chip `v{n}`; `is_final` hiện `FINAL`.
   - Ô khách hàng hiện tên NCC ở dòng dưới; ẩn khi thiếu.
   - Badge loại báo giá rút gọn + tooltip đầy đủ; không tràn ô, layout 6 cột giữ nguyên.
   - Đổi ngôn ngữ vi/en → nhãn đổi theo. Kiểm tra responsive mobile.
5. `npm run verify` trước khi mở PR.
