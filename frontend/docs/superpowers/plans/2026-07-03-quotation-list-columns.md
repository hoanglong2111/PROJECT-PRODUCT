# Bổ sung thông tin bảng danh sách báo giá

Ngày: 2026-07-03

Spec nguồn: `../specs/2026-07-03-quotation-list-columns-design.md`

## Goal

Đưa 4 tín hiệu quyết định lên bảng danh sách báo giá mà không phình cột:

- Hiệu lực báo giá.
- Phiên bản và trạng thái final.
- Nhà cung cấp.
- Loại báo giá.

## Implementation

- Tách logic ngày hiệu lực vào `src/features/quotations/model/quotationValidity.ts`.
- Thêm `QuotationValidityBadge` dùng Mantine `Badge` và i18n `quotations.validity.*`.
- Thêm map `quotationTypeShortLabels` và `quotationTypeFullLabelKeys` trong `quotationModel.ts`.
- Làm giàu 3 ô sẵn có trong `QuotationListView.tsx`; giữ nguyên 6 cột và không sửa `--rfq-list-columns`.

## Verification

- `npx vitest run src/features/quotations/model/__tests__/quotationValidity.test.ts`
- `npx vitest run src/features/quotations/components/__tests__/QuotationValidityBadge.test.tsx`
- `npx vitest run src/features/quotations/model/__tests__/quotationTypeLabels.test.ts`
- `npm run typecheck`
- `npm run check:boundaries`
- `npm run verify`
