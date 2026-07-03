# Quotation list: copy-icon vị trí + làm giàu mock data demo

Ngày: 2026-07-03

## Context

Sau khi implement bảng danh sách báo giá (validity/FINAL/NCC/type), còn 2 vấn đề khi demo:

1. **Icon copy sai vị trí.** `CopyValue` render `<Group>{children}{copyIcon}</Group>` — icon luôn nằm ngay sau `children`. Hiện `QuotationListView` đặt `CopyValue` (chỉ bọc mã) rồi để badge `FINAL` làm *sibling* bên cạnh, nên icon copy (ẩn `opacity:0` nhưng vẫn chiếm chỗ do `copy-on-hover`) **kẹt giữa mã và FINAL** → tạo khoảng trống. Cần đưa icon ra **ngoài cùng**.

2. **Mock data thiếu → nhiều "-".** `qt_001`–`qt_014` trong seed **không có** `customer_ref`, `incoterm_code`, `mode` (chúng gắn ref DO/SHP/DTO), nên cột Khách hàng / Phương thức / Incoterm hiển thị "-". Ngoài ra mọi `valid_until` đều là tương lai gần nên badge hiệu lực không demo được các trạng thái "hết hạn" / "hôm nay". (NCC đã hiển thị đúng — endpoint `getQuotation` đã nhúng `supplier`.)

## Quyết định đã chốt với người dùng

- **valid_until: tương đối theo "hôm nay" khi seed** — tính bằng `new Date()` lúc chạy `npm run mock:seed`, để mỗi lần reseed trước demo luôn đủ 5 trạng thái, không trôi theo thời gian.
- **Phạm vi: làm giàu đầy đủ cho demo đẹp** — điền `customer_ref`/`incoterm`/`mode`; spread `valid_until` 5 trạng thái; đủ 5 `quotation_type`; đảm bảo Total khác 0.

## Phần A — Đưa icon copy ra ngoài cùng (Frontend)

**File:** [QuotationListView.tsx](../../../src/features/quotations/components/QuotationListView.tsx#L122) — ô `rfq-list-code`.

Bỏ `<Group>` bọc ngoài; đưa **mã + badge FINAL vào `children` của `CopyValue`** để icon tự trôi ra sau cùng:

```tsx
<CopyValue value={quotation.quotation_no} hoverReveal>
  <Group gap={6} wrap="nowrap" component="span" align="center">
    <Text component="span" fw={800} size="sm" className="dl-code-text">
      {quotation.quotation_no}
    </Text>
    {quotation.is_final ? (
      <Badge size="xs" variant="light" color="blue">FINAL</Badge>
    ) : null}
  </Group>
</CopyValue>
<QuotationValidityBadge validUntil={quotation.valid_until} />
```

DOM kết quả: `[Group gap4: [Group gap6: mã, FINAL], copyIcon]` → icon nằm sau FINAL (ngoài cùng), ẩn đến khi hover; hết khoảng trống giữa mã và FINAL. `CopyValue`/`CopyIconButton` không đổi.

## Phần B — Làm giàu mock data báo giá (Backend, kbi-mock-api)

**Nguồn canonical:** [seed-mock-data.js](../../../../../kbi-mock-api/scripts/seed-mock-data.js#L293) (`files["quotations"]`). Sửa ở đây rồi chạy `npm run mock:seed` để ghi lại `mock-data/quotations.json`. **Không** sửa JSON trực tiếp (mất khi reseed).

1. **Helper ngày tương đối** (thêm gần đầu file, cạnh `const now = ...`):
   ```js
   const dayFromToday = (n) => {
     const d = new Date();
     d.setDate(d.getDate() + n);
     return d.toISOString().slice(0, 10);
   };
   ```

2. **`qt_001`–`qt_014`: thêm `customer_ref` + `incoterm_code` + `mode`** khớp ngữ nghĩa `note`/`quotation_type`:
   - `customer_ref: "KBI"` cho cả 14 (KBI là khách yêu cầu trong luồng đảo ngược).
   - `mode`: FREIGHT biển FCL → `"SEA_FCL"`; LCL → `"SEA_LCL"`; hàng air → `"AIR"`; TRUCKING → `"ROAD"`.
   - `incoterm_code`: gán hợp lý theo note (VD `"FOB"`, `"CFR"`, `"EXW"`, `"CIF"`), đa dạng vài giá trị.

3. **Spread `valid_until` để demo đủ 5 trạng thái badge** (dùng `dayFromToday`), phân bổ trên tập record:
   - 1 record `dayFromToday(-4)` → **Hết hạn** (đỏ)
   - 1 record `dayFromToday(0)` → **Hết hạn hôm nay** (vàng)
   - 1 record `dayFromToday(3)` → **Sắp / Còn 3 ngày** (cam)
   - phần lớn `dayFromToday(20..40)` → **Còn hạn** (teal)
   - 1 record `valid_until: null` → **Không hạn** (xám)

4. **Đủ 5 `quotation_type`:** hiện có FREIGHT / LOCAL_CHARGE / TRUCKING. Đổi 1–2 record phù hợp sang **CUSTOMS** và **MIXED** (chỉnh `note` kèm cho nhất quán) để badge loại đa dạng.

5. **Total khác 0:** `qt_001`–`qt_014` đã có charge-line trong `files["quotation-charge-lines"]` → Total ổn. Với các record standalone (`qt_020`–`qt_024`) đang là RFQ/DRAFT/REJECTED không có charge-line, Total 0 là hợp lý về nghiệp vụ — không bắt buộc thêm; nếu muốn đẹp hơn có thể thêm 1 charge-line cho record CONFIRMED (`qt_023`).

6. **NCC:** không đụng — `getQuotation` đã nhúng `supplier` từ `supplier_id`.

## Ràng buộc & lưu ý
- Không thêm dependency; không đổi API contract (chỉ thêm giá trị field vốn đã có trong schema `QuotationV1`).
- Giữ nhất quán `mode` với `quotationModeOptions` phía FE (`SEA_FCL`/`SEA_LCL`/`AIR`); `ROAD` cho trucking chỉ để hiển thị (FE `toShippingMode` không dùng ở list).
- Thay đổi span 2 package (FE + BE) — đúng phạm vi task, mỗi package commit riêng theo repo của nó.

## Verification
1. **BE:** `cd kbi-mock-api && npm run mock:seed && npm run dev`. Kiểm tra `GET /api/v1/quotations` trả `customer_ref`/`incoterm_code`/`mode` cho qt_001-014 và `valid_until` trải đủ 5 mốc.
2. **FE:** `cd PROJECT-PRODUCT/frontend && npm run dev` → mở `/quotations`:
   - Không còn "-" ở Khách hàng / Phương thức / Incoterm cho các dòng qt_001-014.
   - Badge hiệu lực xuất hiện đủ: đỏ (hết hạn) / vàng (hôm nay) / cam (sắp) / teal (còn hạn) / xám (không hạn).
   - Badge loại báo giá đa dạng ≥ 4–5 loại (có CUSTOMS, MIXED).
   - Hover một dòng: icon copy nằm **ngoài cùng** sau FINAL; **không còn khoảng trống** giữa mã và FINAL; click copy đúng `quotation_no` và không điều hướng.
3. **FE tĩnh:** `npm run typecheck && npm run check:boundaries` PASS (Phần A không đổi type/ranh giới).
