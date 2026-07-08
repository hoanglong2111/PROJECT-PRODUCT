# RFQ Quotation Picker — Enhancements Design

**Date:** 2026-07-08
**Scope:** `PROJECT-PRODUCT/frontend` — `RfqQuotationPickerModal` only (component, CSS, i18n, one pure helper + test).
**Status:** Approved for planning.

## Background

The RFQ quote launcher modal (`RfqQuotationPickerModal`) lets a user pick an eligible
RFQ (`SUBMITTED` or `RECEIVED`) and create a quotation from it. Three concerns were
raised during review; one turned out to be a UX weakness rather than a data bug.

### Diagnosis of the "linked quotations" concern (not a bug)

An RFQ showing **"Báo giá đã liên kết: 2"** while its status is **RECEIVED** ("Đã
tiếp nhận – Đang xử lý") is **correct by design**, not corrupted data.

In `kbi-mock-api/src/modules/mockV1/mockV1.service.js`:

- `createQuotationFromRequest` creates the quotation with `status: "DRAFT"` (line ~1912).
- `syncRfqStatusFromQuotation` (lines ~1760–1778) advances the RFQ to the status of its
  least-progressed quotation: `DRAFT → RECEIVED`, `PENDING_APPROVAL/ADJUSTMENT/REJECTED
  → QUOTED`, `CONFIRMED → CONFIRMED`.

So a `RECEIVED` RFQ with 2 linked quotations means **2 draft quotations exist, none
submitted for review yet.** The real weakness: `request.quotations.length` counts **all**
non-deleted quotations regardless of status, so "2" is ambiguous (could be 2 drafts, or
1 rejected + 1 draft), and the picker silently allows creating yet another draft.

## Decisions (locked)

| # | Topic | Decision |
|---|---|---|
| 1 | Open full RFQ | Add an "Open RFQ ↗" link that opens the RFQ detail in a **new browser tab**. |
| 2 | Linked-count ambiguity | Replace the single count with a **status breakdown** + a **light non-blocking warning** when drafts already exist. |
| 3 | `SUBMITTED` RFQs | **Keep them visible**; add a **"Receive & create quotation"** action that receives the RFQ then opens the create form in **one click**. |
| 3a | Receive interaction | One-click: `receiveQuotationRequest(id)` → on success proceed to `onConfirm(id)`. |
| 3b | Receive button placement | In the **preview panel** (contextual to the selected RFQ), not on each row. |

## Design

All work is client-side against data the backend already returns. **No API endpoint is
added or changed.** `receiveQuotationRequest` already exists in
`src/shared/api/quotationRequests.ts`; it is wrapped in a `useMutation`.

### A. Linked-quotations breakdown + warning

- New pure helper `summarizeLinkedQuotations(request)` derives counts by bucket from
  `request.quotations[].status`:
  - **Nháp / Draft** → `DRAFT`
  - **Chờ duyệt / In review** → `PENDING_APPROVAL`, `PENDING_ADJUSTMENT`
  - **Đã xác nhận / Confirmed** → `CONFIRMED`
  - **Từ chối / Rejected** → `REJECTED`
- Preview renders chips like `2 nháp · 1 chờ duyệt`, hiding any zero bucket. If total is
  0, render "Chưa có báo giá" ("No quotations yet").
- **Light warning** (informational, does not block): when the count of not-rejected
  quotations `N ≥ 1`, show a soft callout in the preview:
  *"RFQ này đã có N bản nháp — tạo mới sẽ là báo giá thứ N+1."* / EN equivalent.

### B. "Open RFQ" link (new tab)

- In the preview header, next to the RFQ number, render:
  `<a href="/quotation-requests?view=<request.id>" target="_blank" rel="noopener noreferrer">`
  with an "Open RFQ ↗" label (external-link icon).
- The picker modal stays open (new tab), preserving the user's selection context.

### C. `SUBMITTED` receive-and-quote

- `SUBMITTED` RFQs remain in the eligible list (status badge "Đã gửi – chờ tiếp nhận").
- The preview branches on the **selected RFQ's status**:
  - **RECEIVED** → footer primary `Tạo báo giá` (unchanged) → `onConfirm(id)`.
  - **SUBMITTED** → preview shows a callout *"RFQ chưa được tiếp nhận"* plus a
    **`Tiếp nhận & tạo báo giá`** button inside the panel. Clicking it:
    1. runs `useMutation(() => receiveQuotationRequest(id))`, showing `loading`;
    2. on success, invalidates the picker's quotation-requests query key so cached data
       reflects the new `RECEIVED` status, then calls `onConfirm(id)` to open the form;
    3. on error, shows an inline error message in the preview (no `window.alert`).
  - While a RFQ is `SUBMITTED`, the footer `Tạo báo giá` primary is **disabled** so the
    receive step cannot be skipped.

### Component boundaries

- `RfqQuotationPickerModal` gains a `QueryClient` dependency (`useQueryClient`) and a
  `useMutation` for receiving. It already receives `requests`, `isLoading`, `onClose`,
  `onConfirm` from the page — those props are unchanged.
- New pure, exported helper `summarizeLinkedQuotations` lives in the component module
  (alongside `isEligibleRfq` / `eligibleRfqs` / `rfqMatchesSearch`) and is unit-tested.

### Error handling

- Receive mutation failure: inline message in the preview panel, retry by clicking again.
- No change to the create/quote flow error handling (still owned by the page and
  `QuotationForm`).

## Testing

- Extend `src/features/quotations/components/__tests__/rfqQuotationPicker.test.ts`:
  - `summarizeLinkedQuotations` buckets DRAFT / PENDING_* / CONFIRMED / REJECTED correctly
    and reports the not-rejected count used for the warning.
- Manual QA:
  - RECEIVED RFQ with draft quotations shows the breakdown + warning; create still works.
  - SUBMITTED RFQ shows the receive callout; one click receives then opens the form.
  - "Open RFQ ↗" opens the correct RFQ detail in a new tab; modal stays open.
  - Receive failure shows an inline error, not an alert.
- `npm run typecheck`, `npm run check:boundaries`, and the focused Vitest file pass.

## Out of scope

- No backend/API changes; no changes to `QuotationForm` or the quotation status machine.
- No new dependencies. Modal remains a modal (not a drawer/page).
