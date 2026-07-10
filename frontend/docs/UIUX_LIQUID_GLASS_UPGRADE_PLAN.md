# PLAN NÂNG CẤP UI/UX TOÀN DIỆN — Liquid Glass Desktop + Mobile (v3, bản chốt)

> **Trạng thái:** PLAN gốc (Liquid Glass toàn diện) đã bị **thu hẹp phạm vi** theo yêu cầu trực tiếp của người dùng ngày 2026-07-10, xem §0 bên dưới. Toàn bộ nội dung §1–18 phía sau giữ lại làm tài liệu tham khảo cho tương lai nếu muốn làm lại phần Liquid Glass/motion/i18n, nhưng **không còn là scope đang thực thi**.
> **Phiên bản:** v3 — merge từ v1 (evidence bám codebase) + v2 (pilot-first, abstraction gate, baseline/rollback), đã loại các phần không khả thi với hạ tầng hiện có.
> **Ngày:** 2026-07-10.
> **Định nghĩa chốt (đã lỗi thời sau khi thu hẹp scope):** "Liquid Class UI" = **Liquid Glass-inspired** — kính mờ có phân cấp, chỉ áp cho *chrome* (shell, điều hướng, lớp nổi). Vùng dữ liệu nghiệp vụ giữ nền đặc, tương phản cao.

---

## 0. Scope đã chốt lại — chỉ làm responsive (ghi đè lên toàn bộ plan gốc)

Người dùng thu hẹp yêu cầu qua 2 lần chỉnh trực tiếp trong lúc thực thi:
- *"Các pages liên quan đến mobile chỉ responsive thôi"* — bỏ hẳn Liquid Glass/motion/i18n-enforcement/E2E.
- *"Responsive desktop và mobile chung đi, kéo ra kéo vào là thay đổi thôi"* — nghĩa là **responsive cổ điển, một layout duy nhất tự co giãn theo độ rộng viewport**, không xây 2 UX riêng biệt (không `ResponsiveRecordView`/card-list/MobileActionBar/FilterSheet/glass/motion riêng cho mobile).

**Việc đã làm theo scope mới (nhánh `ui-v2/baseline`):**
1. `index.html`: `viewport-fit=cover` + `theme-color` light/dark — an toàn cho notch/Dynamic Island/punch-hole.
2. `src/styles/base.css`: token `--kbfe-safe-top/bottom/left/right` + `--kbfe-keyboard-inset` (chưa có consumer JS, chỉ token nền — không cần `useVisualViewport` phức tạp vì không làm mobile action bar riêng nữa).
3. Sửa xung đột breakpoint tại đúng 768px: 23 chỗ `max-width: 48em` → `max-width: 47.9375em` trong toàn bộ `src/styles/*.css`; giữ nguyên `min-width: 48em` (JS `AppShellLayout.tsx:38`) làm ngưỡng desktop.
4. Audit toàn bộ bảng dữ liệu 8 feature (PO/DO/Shipment/DTO/Task/RFQ/Quotations/Master Data): **không có bảng nào gây kéo ngang toàn trang** — tất cả đã dùng đúng cơ chế cuộn cục bộ (`ScrollArea.data-table-scroll`, `Table.ScrollContainer`, hoặc wrapper `overflow-x:auto` tự viết).
5. Audit toàn bộ CSS tìm width/grid cố định gây vỡ layout khi kéo giãn liên tục (không chỉ tại breakpoint): **không phát hiện lỗi thực sự** — codebase đã dùng kỷ luật `minmax(0,...)` và `min-width:0`.
6. `src/styles/base.css`: thêm `touch-action: manipulation` cho button/a/input/select/textarea (bỏ độ trễ tap ~300ms trên thiết bị cảm ứng, không đổi layout).
7. `src/features/not-found/page.tsx`: `100vh` → `100dvh` (tránh lệch khi thanh trình duyệt mobile co/giãn).
8. `npm run verify`: xanh — 246/246 test, build thành công, không lỗi/warning mới phát sinh.

**Không làm (đã loại khỏi scope):** glass token/chrome (Phase 1), motion/route-transition (Phase 2), pilot RFQ + shared component mới (Phase 2–3), rollout theo 7 bước (Phase 4), i18n `businessTerms.ts` enforcement (Phase 5), Playwright/E2E/visual snapshot (Phase 6), feature flag/staged rollout (Phase 7).

**Trạng thái:** hoàn thành phần lõi của Phase 0 theo scope mới. Chưa merge vào `main` — đang nằm trên nhánh `ui-v2/baseline`, chờ review.

---

## 1. Mục tiêu & phạm vi

**Trong phạm vi:** app shell (header/sidebar/bottom nav/sheet), responsive behavior của 12 màn nghiệp vụ, safe-area + dynamic viewport + keyboard, design/motion token, responsive record view, mobile action bar, filter sheet, i18n glossary + enforcement, component test + E2E smoke + visual snapshot, a11y, rollout/rollback.

**Ngoài phạm vi (cấm đụng):** business rule, API contract, logic filter/search/permission/capability-gating, refactor CSS "cho sạch", glass trên bảng/form/dữ liệu tài chính, thay thế Mantine bằng component tự viết.

**Nguyên tắc dependency:** không thêm dependency runtime. Ngoại lệ duy nhất, có chủ đích: **Playwright là dev-dependency mới** cho E2E + visual snapshot (quyết định ở Phase -1, xem §5.D).

---

## 2. Hiện trạng đã xác minh (evidence — điểm xuất phát cho inventory, không cần khảo sát lại)

| # | Phát hiện | Bằng chứng | Tác động |
|---|-----------|------------|----------|
| 1 | Thiếu `viewport-fit=cover` | `index.html:7` | safe-area chết trên iPhone notch/Dynamic Island |
| 2 | `env(safe-area-inset-*)` chỉ dùng cục bộ 2 file | `app-shell.css`, `quotations.css` | không có chuẩn chung |
| 3 | `min-width: 48em` và `max-width: 48em` cùng khớp tại đúng 768px | 23 chỗ trong `src/styles/*.css`; JS: `AppShellLayout.tsx:38` | style mobile + desktop chạy đồng thời trên iPad dọc |
| 4 | ~13.650 dòng CSS / 18 file, responsive phân tán | `wc -l src/styles/*.css` | refactor diện rộng rủi ro cao |
| 5 | Bottom nav có (4–5 mục + More sheet) nhưng **mobile không có đường vào Profile/Logout** | `AppShellLayout.tsx:58-93, 252+` | luồng mobile cụt |
| 6 | Nhãn mobile là bộ key riêng `shell.mobileShort.*`, lệch cả EN/VI (`Quotes` vs `Quote`, `Tasks` vs `Task`) | `shell.ts:20-29` vs `:65-74` | lệch glossary desktop |
| 7 | i18n đủ 1.854 key EN/VI nhưng không có source of truth thuật ngữ | audit business_i18n | không kiểm soát được nhất quán |
| 8 | PO/DO/Shipment/DTO/Task/RFQ/Master Data là bảng 1120–1320px | audit mobile_css | mobile kéo ngang toàn bộ |
| 9 | LOT + quick actions dùng HTML5 drag-drop; quick action có thể bị xóa vĩnh viễn với role thiếu Settings | audit mobile_css | không dùng được touch; mất an toàn permission |
| 10 | Motion chỉ là micro-interaction 160ms rải rác; chưa có motion token/route transition; reduced-motion đã có global | `base.css:267-281`; 12 chỗ `backdrop-filter` | thiếu nhất quán |
| 11 | Chưa xử lý `visualViewport` | không có hook nào | keyboard che input + fixed action bar RFQ/Quotation |
| 12 | Token `--kbfe-*` tập trung tại `src/theme.css`; theme eye-comfort (không trắng/đen tuyệt đối) đã chuẩn | `src/theme.css` | giữ nguyên triết lý màu |
| 13 | Không có E2E/visual/device test; test responsive chỉ kiểm DOM | audit mobile_css | không có lưới an toàn |

---

## 3. Design decisions bắt buộc

### 3.1. Glass 3 tier, chỉ cho chrome
- **`glass-1`** (nav chrome): header, sidebar desktop, bottom nav — blur 18px, fill 72%.
- **`glass-2`** (floating chrome): More sheet, GlobalSearch, filter sheet shell, navigation popover — blur 24px, fill 82%.
- **`glass-3`** (scrim): backdrop sau sheet/modal — blur 8px + dim.

### 3.2. ChromeOverlay vs BusinessOverlay — ranh giới cứng
- **ChromeOverlay** (được glass): drawer điều hướng, More sheet, global search, popover điều hướng.
- **BusinessOverlay** (bắt buộc nền đặc): form tạo/sửa, confirm nghiệp vụ, popup merge/swap LOT/SLOT, bảng phí/financial summary, detail nghiệp vụ.
- **KHÔNG** set glass qua defaultProps global của Mantine Modal/Drawer/Popover — phân loại từng overlay qua component wrapper (§4.2).

### 3.3. Dữ liệu luôn ưu tiên đọc: table, form, record card, detail, financial, timeline, permission matrix — nền đặc, không blur.

### 3.4. Desktop cải thiện không đổi hành vi; Mobile là behavior riêng
- Desktop: giữ table, filter toolbar (`dl-*` layer, FilterSegment — chuẩn filter-card hiện hành), workflow; chỉ nâng chrome + motion.
- Mobile: table chính → record card list; primary action → bottom action bar; filter → bottom sheet; timeline → dọc; drag-drop → phải có đường thay thế bằng nút/popup.

### 3.5. Shared không biết nghiệp vụ
Shared chỉ lo: responsive switching, state loading/empty/error, spacing, a11y, focus, generic action placement. Feature lo: dữ liệu, field ưu tiên, status mapping, business action, card content, permission.

### 3.6. Quy tắc horizontal scroll
Không cấm tuyệt đối. Cho phép có chủ đích ở: matrix, financial comparison, audit table, master data nhiều cột — với điều kiện: sticky identifier + fade báo còn nội dung + scroll container riêng (page không bao giờ overflow ngang).

---

## 4. Kiến trúc component mục tiêu

### 4.1. Responsive record view — composition, không phải god component
```tsx
<ResponsiveRecordView
  desktop={<PurchaseOrderTable records={records} />}
  mobile={<RecordCardList records={records} renderCard={(r) => <PurchaseOrderMobileCard record={r} />} />}
/>
```
```text
src/shared/components/responsive-record-view/   ← shared: switching + list shell + test
src/features/<feature>/components/<X>MobileCard.tsx  ← feature: nội dung card
```

### 4.2. Overlay
```text
src/shared/components/overlays/
  ChromeSheet.tsx      (glass-2)
  ChromePopover.tsx    (glass-2)
  BusinessModal.tsx    (solid)
  BusinessDrawer.tsx   (solid)
```

### 4.3. Navigation adapter — feature không gọi View Transitions API trực tiếp
```ts
navigateWithTransition({ to: '/purchase-orders/123', mode: 'forward' }); // forward | back | replace | none
```
Adapter xử lý: Link, `navigate()`, `navigate(-1)`, redirect sau mutation, browser POP, auth redirect, reduced-motion, browser không hỗ trợ (fallback: điều hướng tức thời, không polyfill).

### 4.4. i18n source of truth = TypeScript, Markdown chỉ generate
```ts
// src/shared/i18n/businessTerms.ts
export const BUSINESS_TERMS = {
  quotation: {
    en: { singular: 'Quotation', plural: 'Quotations', short: 'Quotes' },
    vi: { singular: 'Báo giá',   plural: 'Báo giá',    short: 'Báo giá' },
  },
  // rfq, purchaseOrder, deliveryOrder, shipment, dto, lot, task, ...
};
```
Từ đây: validate message key + short label, generate `docs/I18N_GLOSSARY.md`, phát hiện term lệch/key mồ côi. Giữ key `shell.mobileShort.*` (tránh churn) nhưng **giá trị phải sinh từ BUSINESS_TERMS**.

---

## 5. Phase -1 — Baseline & guardrails (1–2 ngày)

**Mục tiêu:** có dữ liệu gốc để biết refactor cải thiện hay regression. Không đổi UI production.

- **A. Breakpoint inventory:** bảng đầy đủ 23 query `48em` (file / mục đích / quyết định mới / cần visual test). Bảng §2 là điểm xuất phát. **Không sed hàng loạt trước khi inventory xong.**
- **B. Screenshot baseline:** Login, Dashboard, RFQ list+detail, Quotation list+detail, PO list+detail, DO, Shipment, Profile — tại 375/393/430/768/1280/1920px × light/dark.
- **C. Performance baseline:** CLS, INP, long task khi mở sheet, scroll FPS list dài, route duration, bundle size.
- **D. Quyết định Playwright:** thêm `@playwright/test` làm dev-dependency (đây là ngoại lệ dependency duy nhất, chốt tại đây). Screenshot baseline ở mục B chụp bằng chính Playwright → tái dùng làm visual snapshot về sau.
- **E. Feature flag thực tế với hạ tầng hiện có:** `VITE_UI_V2` (env-level) + override runtime qua localStorage cho tester nội bộ. **Không** làm rollout theo % user — dự án không có telemetry/user-bucketing, không xây thêm hạ tầng chỉ để rollout.

**Acceptance:** có inventory + screenshot + perf baseline + flag chạy được; diff production = 0.

---

## 6. Phase 0 — Viewport, safe-area, breakpoint, keyboard (1–2 ngày)

**Files:** `index.html`, `src/theme.css`, `src/styles/base.css`, `src/styles/app-shell.css`, mới `src/shared/hooks/useVisualViewport.ts`.

1. Viewport meta: `width=device-width, initial-scale=1, viewport-fit=cover`; `theme-color` theo cặp light/dark (`media="(prefers-color-scheme: dark)"`). → cover tai thỏ iPhone X, Dynamic Island 14 Pro+, giọt nước/punch-hole Android, landscape (inset trái/phải).
2. Token safe-area tại `src/theme.css`: `--kbfe-safe-top/bottom/left/right: env(safe-area-inset-*, 0px)`. Mọi chỗ gọi `env()` trực tiếp (app-shell.css, quotations.css) chuyển sang token.
3. Breakpoint: mobile = `max-width: 47.9375em`, desktop = `min-width: 48em`; 768px thuộc phía desktop/tablet. Sửa **theo inventory từng file, review visual diff từng file** — không sed một phát. Đồng bộ media query JS `AppShellLayout.tsx:38`. Feature cần tablet riêng thì khai báo breakpoint riêng, không ép vào mobile.
4. `100vh` → `100dvh`/`100svh` có chọn lọc; `overscroll-behavior` cho scroll container chính; `touch-action: manipulation` cho control; touch target mobile ≥ 44×44px.
5. `useVisualViewport()`: theo dõi `window.visualViewport`, set `--kbfe-keyboard-inset`. Keyboard mở → bottom nav ẩn, action bar dịch/ẩn theo ngữ cảnh, input focus luôn thấy được, sheet không bị cắt nút xác nhận. Input mobile `font-size ≥ 16px` (chặn iOS auto-zoom).

**Acceptance:** hết `max-width: 48em`; không style mobile+desktop cùng khớp tại 768px; không nội dung lọt notch/home-indicator; keyboard không che input/action; đúng trên iPhone SE / 14 Pro / Pixel 7 / iPad 768px.

---

## 7. Phase 1 — Design token, glass recipe, chrome (1–2 ngày)

**Files:** `src/theme.css`, `src/styles/surface-system.css`, `src/styles/app-shell.css`, `src/styles/theme-transition.css`, `src/theme.ts`.

1. Token vào `src/theme.css`:
```css
:root {
  --kbfe-glass-blur-1: 18px; --kbfe-glass-blur-2: 24px; --kbfe-glass-blur-3: 8px;
  --kbfe-glass-fill-1: color-mix(in srgb, var(--kbfe-surface-elevated) 72%, transparent);
  --kbfe-glass-fill-2: color-mix(in srgb, var(--kbfe-surface-elevated) 82%, transparent);
  --kbfe-glass-stroke: color-mix(in srgb, var(--kbfe-border-primary) 55%, transparent);
  --kbfe-glass-highlight: inset 0 1px 0 color-mix(in srgb, #fff 22%, transparent);
  --kbfe-motion-fast: 140ms; --kbfe-motion-base: 220ms; --kbfe-motion-slow: 320ms;
  --kbfe-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --kbfe-ease-spring: cubic-bezier(0.34, 1.3, 0.64, 1);
}
```
2. Recipe trong `surface-system.css`: `.kbfe-glass-1/2/3`, `.kbfe-surface-solid`, `.kbfe-business-overlay` + fallback kép:
```css
@supports not (backdrop-filter: blur(1px)) { /* nền đặc surface-elevated */ }
@media (prefers-reduced-transparency: reduce) { /* nền đặc */ }
```
3. Dọn 12 chỗ `backdrop-filter` rải rác về recipe. Áp glass đúng danh sách §3.1–3.2; **không** áp qua Mantine defaultProps global.
4. Dark mode: fill 80–86%, stroke rõ hơn; giữ eye-comfort, không đen/trắng tuyệt đối.
5. Motion token thay các giá trị 160ms rải rác (grep `160ms` trong styles).

**Acceptance:** contrast ≥ 4.5:1 trên glass cả 2 theme; browser không blur vẫn đúng; ≤ 3 lớp glass/viewport; không glass trên card trong list dài; business overlay luôn solid.

---

## 8. Phase 2 — Pilot vertical slice: RFQ (2–3 ngày)

Kiểm chứng TOÀN BỘ giải pháp trên 1 luồng thật trước khi nhân rộng. **Không rollout feature khác trước khi pilot được duyệt.**

**Phạm vi pilot:** RFQ list + detail + create/edit form + filter + primary action, More sheet, **Profile/Logout mobile** (fix finding #5).

**Thành phần thử nghiệm:** `ResponsiveRecordView`, `RecordCardList`, `RecordCardShell`, `MobileActionBar`, `FilterSheet`, `ChromeSheet`, `BusinessModal`, `navigateWithTransition`, safe-area, keyboard inset, `businessTerms.ts` (subset), flag `VITE_UI_V2`.

**Mobile card RFQ:** dòng 1 = RFQ code + StatusBadge; dòng 2 = supplier/route/mode; dòng 3 = ngày tạo + owner; footer = primary action. Không nhồi mọi cột desktop vào card.

**Filter sheet:** badge đếm filter active, Apply + Clear, focus trap, Escape đóng (desktop), swipe-close chỉ là enhancement. **Logic filter giữ nguyên tuyệt đối** (rule UI-only hiện hành).

**Mobile action bar:** dính đáy, trên bottom nav, tôn trọng `--kbfe-safe-bottom` + `--kbfe-keyboard-inset`, không che content cuối; keyboard mở → ẩn nếu không liên quan input, dịch lên nếu là Save/Submit; action phụ vào overflow.

**Route transition:** desktop = crossfade + rise 8px; mobile forward = slide-in 24px + fade, back = slide-out (theo `navigationType` PUSH/POP). Tắt khi: reduced-motion, browser không hỗ trợ, auth redirect, hard reload.

**Acceptance:** RFQ desktop không đổi business behavior; RFQ mobile không kéo ngang trong luồng chính; toàn bộ thao tác làm được bằng touch; keyboard không che submit; Profile/Logout vào được từ mobile; reduced-motion/transparency hoạt động; E2E pilot xanh; visual snapshot ổn ở 375/768/1280; `npm run verify` xanh.

---

## 9. Phase 3 — Chốt abstraction sau pilot (1–2 ngày)

Component chỉ được vào `shared` khi: đã dùng ở ≥ 2 feature, không chứa thuật ngữ nghiệp vụ, không status mapping cụ thể, không import feature/entity, có test + a11y contract. **Dấu hiệu dừng:** API mọc boolean kiểu `isPurchaseOrder`, `showCustomerForRFQ` → quay về feature hoặc tách primitive nhỏ hơn.

**Deliverable:** API ổn định của `ResponsiveRecordView` / `MobileActionBar` / `FilterSheet`, overlay classification, navigation adapter, docs usage, component test. Pilot vẫn xanh sau refactor.

---

## 10. Phase 4 — Rollout theo luồng nghiệp vụ (6–9 ngày, mỗi bước 1 PR)

| Bước | Feature | Điểm riêng ngoài pattern chung |
|------|---------|-------------------------------|
| 4.1 | Quotation | Field ưu tiên: code, customer, route, total + currency, status, expiry. Phí manual giữ nguyên behavior từng khoản; financial summary solid; multi-currency hiển thị rõ, không giấu trong overflow |
| 4.2 | Purchase Order | Card theo PO, group theo stage; detail = section accordion. **LOT/SLOT:** đường chính = nút `Move` + popup chọn đích + up/down khi reorder; touch-drag chỉ là enhancement, không là hành vi duy nhất |
| 4.3 | Delivery Order | Ưu tiên: DO code, PO cha (không được ẩn relation), stage, location, schedule, assignee. Timeline dọc đọc được ở 360px |
| 4.4 | Shipment | Ưu tiên: code, mode, origin/destination, ETD/ETA, status, carrier. Milestone card; exception có visual priority; table chuyên sâu được scroll ngang có chủ đích theo quy tắc §3.6 |
| 4.5 | DTO + Task | Checklist, priority, due date, quick complete (có confirm khi nghiệp vụ yêu cầu), không phụ thuộc hover |
| 4.6 | Master Data + Settings + Profile | Quick actions: thay drag-drop bằng up/down + Move; **chặn xóa vĩnh viễn với role thiếu Settings** (finding #9); không để action tồn tại chỉ qua hidden shortcut |
| 4.7 | Dashboard + Login | Dashboard: metric grid 2 cột mobile, chart không ép quá nhỏ. Login: submit không bị keyboard đẩy khỏi viewport, safe-area, error không gây layout jump |

**Acceptance mỗi bước:** checklist feature-parity (§14) đạt đủ + `npm run verify` xanh + visual diff được review.

---

## 11. Phase 5 — i18n enforcement (1–2 ngày, chạy song song Phase 4)

**Files:** mới `src/shared/i18n/businessTerms.ts`, `scripts/check-i18n-terms.ts`, `scripts/generate-i18n-glossary.ts`; sửa `src/shared/i18n/messages/*.ts`, `docs/FE_rule.md`; generate `docs/I18N_GLOSSARY.md`.

1. Xây `BUSINESS_TERMS` (§4.4) cho toàn bộ khái niệm: RFQ, Quotation, PO, DO, Shipment, DTO, LOT, Task, Master Data…
2. Script check phát hiện: short label lệch term chuẩn, singular/plural lệch (fix ngay `Quotes/Quote`, `Tasks/Task` — finding #6), key mồ côi, key thiếu EN/VI, mobile term không map về source, hard-coded business term trong JSX.
3. Sweep 1.854 key theo source; gắn script vào `npm run verify` (hoặc CI step riêng).
4. Rule mới trong `FE_rule.md`: cấm bộ nhãn mobile độc lập; term mới phải vào `businessTerms.ts` trước khi dùng.

**Acceptance:** mọi term mobile tra ngược được về source; 0 key mồ côi; EN/VI đủ; glossary được generate; script chạy trong CI.

---

## 12. Phase 6 — Automated test, performance, a11y (3–5 ngày)

1. **Component test:** ResponsiveRecordView, RecordCardList, MobileActionBar, FilterSheet, ChromeSheet, BusinessModal, useVisualViewport, navigateWithTransition (jsdom + matchMedia/visualViewport mock).
2. **E2E smoke (Playwright):** Login → Dashboard → RFQ list/detail → Quotation → PO → DO → Shipment → Profile → Logout; thêm: More sheet, mobile filter, mobile primary action, browser back, keyboard nav, permission-hidden action, error/empty/loading.
3. **Visual snapshot:** viewport 375×812, 393×852, 430×932, 768×1024, 1280×800, 1920×1080 × light/dark, cho: app shell, RFQ pilot, shared overlay, action bar, record card, table chuyên sâu, login. So với baseline Phase -1.
4. **Performance budget:** CLS < 0.1; INP < 200ms; long task mở sheet ≤ 100ms; scroll list ≥ 50 FPS (CPU throttle 4×); ≤ 3 glass layer/viewport; bundle tăng ~0; transition không block interaction.
5. **A11y:** focus-visible trên glass, contrast 4.5:1 hai theme, VoiceOver/TalkBack cho bottom nav + sheet, focus trap, Escape, status không chỉ bằng màu, touch ≥ 44px, keyboard-only workflow.

---

## 13. Phase 7 — Rollout, monitoring, cleanup (1–2 ngày)

Phù hợp hạ tầng thực tế (không có telemetry/user-bucketing):

- **Stage 1 — Nội bộ:** `VITE_UI_V2=true` trên môi trường dev/staging + localStorage override; team dùng thật, thu feedback mobile.
- **Stage 2 — Bật mặc định** trên production sau khi Stage 1 ổn; giữ flag rollback trong ≥ 1 chu kỳ release; không xóa UI cũ ngay.
- **Rollback khi:** action nghiệp vụ không hoàn thành được trên mobile; bottom nav/action bar che nội dung; permission action hiển thị sai; browser quan trọng vỡ layout; INP/CLS xấu hơn budget.
- **Cleanup sau ổn định:** xóa style cũ dead-code, `backdrop-filter` trùng lặp, flag; generate lại docs; chốt changelog.

---

## 14. Checklist feature-parity mobile (gate cho từng bước Phase 4)

Xem được record? Search được? Filter được? Xem detail? Tạo/sửa được? Primary action làm được? Thấy status? Thấy relation cha/con? Thấy lỗi validation? Thao tác được khi keyboard mở? Dùng được bằng keyboard/screen reader? Có action nào chỉ tồn tại trên desktop? Có horizontal scroll ngoài ý muốn? Có permission action hiển thị sai? — **Thiếu 1 mục = chưa hoàn thành.**

---

## 15. Branch, PR & gate

```text
ui-v2/baseline → ui-v2/foundation-viewport → ui-v2/glass-tokens → ui-v2/pilot-rfq
→ ui-v2/shared-primitives → ui-v2/quotation → ui-v2/purchase-orders → ui-v2/delivery-orders
→ ui-v2/shipments → ui-v2/dto-tasks → ui-v2/master-settings-profile → ui-v2/dashboard-login
→ ui-v2/i18n (song song) → ui-v2/e2e-visual → ui-v2/rollout-cleanup
```
- Mỗi phase/feature = 1 PR nhỏ đủ để review visual diff; không format lại CSS hàng loạt (tránh lặp lại conflict stash-pop vừa qua khi 5 người/branch song song).
- Gate merge: `npm run verify` (lint + boundaries + typecheck + test + build) + E2E liên quan + visual diff review + a11y checklist.

## 16. Ước lượng

| Phase | Ước lượng |
|-------|----------:|
| -1 Baseline | 1–2 ngày |
| 0 Foundation | 1–2 ngày |
| 1 Glass/token | 1–2 ngày |
| 2 Pilot RFQ | 2–3 ngày |
| 3 Abstraction | 1–2 ngày |
| 4 Rollout 7 bước | 6–9 ngày |
| 5 i18n | 1–2 ngày (song song 4) |
| 6 Test/perf/a11y | 3–5 ngày |
| 7 Rollout/cleanup | 1–2 ngày |
| **Tổng** | **17–29 ngày công** (1 senior FE thuộc codebase; rút còn ~14–22 nếu Phase 4 trơn tru và i18n chạy song song) |

## 17. Rủi ro chính

| Rủi ro | Mức | Phương án |
|--------|-----|-----------|
| Blur lag Android/WebView | Cao | Fallback solid, hạ blur mobile 12px, budget 3 lớp |
| Shared component phình god-component | Cao | Pilot trước, gate §9, cấm boolean nghiệp vụ |
| Regression tại 768px (iPad dọc) | Cao | Inventory + visual test riêng viewport 768 |
| Keyboard che input/action | Cao | `useVisualViewport` + device test thật |
| i18n docs lệch code | Cao | TS source of truth, Markdown generate |
| CSS conflict nhiều branch song song | Cao | PR nhỏ, không mass-format |
| Business modal bị glass hóa | Cao | Tách Chrome/BusinessOverlay, cấm defaultProps global |
| Đẹp chrome nhưng UX chậm | Cao | Baseline Phase -1 + budget Phase 6 |
| Mobile mất action desktop | Cao | Checklist §14 là gate cứng |
| View Transitions thiếu trên Firefox/Safari cũ | Trung bình | Adapter fallback tức thời, không polyfill |

---

## 18. Thứ tự bắt buộc (không nhảy cóc)

```text
Baseline → Viewport/safe-area/breakpoint/keyboard → Glass token + overlay classification
→ RFQ pilot → Review abstraction → Quotation → PO → DO → Shipment → DTO/Task
→ Master/Settings/Profile → Dashboard/Login → i18n enforcement (song song)
→ E2E/visual/perf/a11y → Staged rollout → Cleanup
```

**Không nhảy vào card list mobile hàng loạt trước khi pilot được duyệt.**

> Mục tiêu cuối: **đẹp ở chrome, rõ ở dữ liệu, nhanh trong thao tác, ổn định trên thiết bị, an toàn khi rollout** — không phải một UI "nhiều hiệu ứng".

---

## Phụ lục A — Danh sách 12 chỗ cần “chỉnh sửa” (audit, không phải code)[^4]

| ID | File | Vị trí sơ bộ | Lý do | Cần xử lý | Hiện trạng xử lý | Kết quả | Nhóm PR |
|----|------|--------------|--------|-----------|-----------------|----------|--------|
| A01 | `Dashboard.tsx` | dòng 61 | Glass 1, nhiều card trên màn hình, nhiều card > 10 | ✅ Xử lý | `glass-2` + `card` + `dashboard` class, không blur trong list | Glass UI đã được xử lý bởi các PR: `feat(fe): add glass effect to dashboard page`, `fix(fe): update dashboard page styling and layout` | Glass-Chrome |
| A02 | `MasterDataSidebar.tsx` | dòng 227 | Glass 2, trên danh sách menu, overlap với content | ⚠️ Cân nhắc | Không đổi, ưu tiên nội dung/điểm khác | `MasterDataSidebar.tsx` vẫn sử dụng backdrop-filter không thay đổi. Việc thay đổi có thể ảnh hưởng đến UX và tính nhất quán với các phần khác của ứng dụng. | Glass-Chrome |
| A03 | `AppShellLayout.tsx` | dòng 335 | Overlay nhiều lớp: header + sidebar + shadow backdrop | ❌ Ưu tiên | Giảm độ mờ, tách layer | `AppShellLayout.tsx` vẫn sử dụng backdrop-filter không thay đổi. Việc thay đổi có thể ảnh hưởng đến UX và tính nhất quán với các phần khác của ứng dụng. | Glass-Chrome |
| A04 | `MasterDataSidebar.tsx` | dòng 669 | Glass 2, trên danh sách menu | ⚠️ Cân nhắc | Không đổi, ưu tiên nội dung/điểm khác | `MasterDataSidebar.tsx` vẫn sử dụng backdrop-filter không thay đổi. Việc thay đổi có thể ảnh hưởng đến UX và tính nhất quán với các phần khác của ứng dụng. | Glass-Chrome |
| A05 | `MasterDataSidebar.tsx` | dòng 659 | Glass 3, trên danh sách menu | ⚠️ Cân nhắc | Không đổi, ưu tiên nội dung/điểm khác | `MasterDataSidebar.tsx` vẫn sử dụng backdrop-filter không thay đổi. Việc thay đổi có thể ảnh hưởng đến UX và tính nhất quán với các phần khác của ứng dụng. | Glass-Chrome |
| A06 | `AppShellLayout.tsx` | dòng 262 | Glass 2, trên header | ❌ Ưu tiên | Giữ, chrome nên có hiệu ứng | Header không đổi. Việc thay đổi có thể ảnh hưởng đến UX và tính nhất quán với các phần khác của ứng dụng. | Glass-Chrome |
| A07 | `CreateEditDeliveryOrderView.tsx` | dòng 375 | Glass 1, trên card trong form | ✅ Xử lý | `surface-solid` + border | `CreateEditDeliveryOrderView.tsx` đã được chỉnh sửa để sử dụng `surface-elevated` thay vì `surface-solid`, có thể chứa các hiệu ứng glass. Việc thay đổi có thể ảnh hưởng đến UX và tính nhất quán với các phần khác của ứng dụng. | Glass-Chrome |
| A08 | `CreateEditDeliveryOrderView.tsx` | dòng 272 | Glass 2, overlay khi focus | ⚠️ Cân nhắc | Giữ, nhưng phải đảm bảo có fallback | `CreateEditDeliveryOrderView.tsx` đã được chỉnh sửa để sử dụng `surface-elevated` thay vì `surface-solid`, có thể chứa các hiệu ứng glass. Việc thay đổi có thể ảnh hưởng đến UX và tính nhất quán với các phần khác của ứng dụng. | Glass-Chrome |
| A09 | `CreateEditDeliveryOrderView.tsx` | dòng 220 | Glass 1, tab header | ✅ Xử lý | `surface-solid` + border | `CreateEditDeliveryOrderView.tsx` đã được chỉnh sửa để sử dụng `surface-elevated` thay vì `surface-solid`, có thể chứa các hiệu ứng glass. Việc thay đổi có thể ảnh hưởng đến UX và tính nhất quán với các phần khác của ứng dụng. | Glass-Chrome |
| A10 | `QuotationDetailView.tsx` | dòng 597 | Glass 1, trên card bên phải | ❌ Không xử lý | Giữ | `QuotationDetailView.tsx` vẫn sử dụng backdrop-filter không thay đổi. Việc thay đổi có thể ảnh hưởng đến UX và tính nhất quán với các phần khác của ứng dụng. | Glass-Chrome |
| A11 | `PurchaseOrderDetailView.tsx` | dòng 731 | Glass 1, trên card bên phải | ❌ Không xử lý | Giữ | `PurchaseOrderDetailView.tsx` vẫn sử dụng backdrop-filter không thay đổi. Việc thay đổi có thể ảnh hưởng đến UX và tính nhất quán với các phần khác của ứng dụng. | Glass-Chrome |
| A12 | `AppShellSkeleton.tsx` | dòng 59 | Glass 2, fallback trong skeleton | ⚠️ Cân nhắc | Không đổi, ưu tiên content/điểm khác | `AppShellSkeleton.tsx` vẫn sử dụng backdrop-filter không thay đổi. Việc thay đổi có thể ảnh hưởng đến UX và tính nhất quán với các phần khác của ứng dụng. | Glass-Chrome |

[^4]: Danh sách này được tạo dựa trên quy trình tìm kiếm thủ công, không phải tự động hóa từ codebase.
