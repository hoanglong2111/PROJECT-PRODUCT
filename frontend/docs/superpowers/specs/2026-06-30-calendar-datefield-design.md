# Calendar redesign via shared `DateField` — design

Date: 2026-06-30
Status: Approved (pending spec review)

## Problem

Every date field in the app is a native HTML date input (`<TextInput type="date">`) —
26 occurrences across 12 files. The calendar popup is therefore the browser/OS native
picker, which:

- cannot be styled with CSS (not "nịnh mắt"),
- renders inconsistently across browsers,
- feels detached / misaligned from its input box ("lệch layout").

There is no custom calendar component or calendar CSS in the codebase today.
`@mantine/dates` styles are already imported in `main.tsx` but no date component is used.

## Goal / success criteria

1. **Nịnh mắt** — a themed, consistent calendar matching the app's design tokens.
2. **UX useful** — VN-friendly `DD/MM/YYYY` display, clearable, keyboard + click.
3. **Không lệch layout** — calendar popover anchored directly under the input box; the
   input box itself renders identically to other inputs so surrounding layout is unchanged.

## Key fact that makes this low-risk

Mantine v9 `DatePickerInput` stores its value as a **`DateStringValue` (`'YYYY-MM-DD'`
string)** — verified in `node_modules/@mantine/dates/lib/components/DatePicker/DatePicker.d.ts`
(`value: DateStringValue | null`). This is the **same string format** the native
`type="date"` inputs already use. So the migration changes presentation only — no form,
filter, validation, or business-logic changes. `onChange` is called with the string value
directly (not a DOM event).

## Approach

One shared wrapper component, not 26 inline `DatePickerInput` swaps. Centralizes styling
and behavior; avoids prop drift.

### 1. Component — `src/shared/components/DateField.tsx`

Wraps Mantine `DatePickerInput`. String interface in/out so it works with both binding
patterns found in the codebase:

- Controlled string: `value={str} onChange={(v) => set(v ?? '')}`
- Mantine form: `{...form.getInputProps('field')}` (direct spread)

Props (passthrough + sensible defaults):

- `label`, `value: string | null`, `onChange?: (value: string | null) => void`
- `placeholder`, `disabled`, `required`, `error`, `className`, `size`, `name`
- `leftSection` — default calendar icon (`IconCalendar`), overridable
- `minDate?`, `maxDate?` — strings (map from native `min`/`max`)
- `clearable` — default `true` (native date inputs are already clearable → no behavior change)
- Fixed defaults: `valueFormat="DD/MM/YYYY"`, `popoverProps={{ position: 'bottom-start',
  withinPortal: true, shadow: 'md' }}`, a stable `kbfe-date-field` class plus a `classNames`
  hook tagging the calendar dropdown for styling.

The input renders on the same Mantine `Input` base as the app's other fields, so swapping
in place does not shift layout.

### 2. Calendar CSS — `src/styles/date-field.css`

Imported from `src/styles.css` (after `components.css`). Theme-aware via existing
`--kbfe-*` tokens, respecting the eye-comfort themes (no pure white/black):

- Dropdown surface: `--kbfe-surface-elevated`, `--kbfe-border-primary`, `--kbfe-shadow-md`,
  rounded corners, comfortable padding.
- Weekday header row: dimmed, uppercase, slight letter-spacing.
- Day cells: rounded; smooth hover tint from `--kbfe-primary`; visible focus ring.
- **Today**: subtle accent ring. **Selected**: filled `--kbfe-primary` with readable
  contrast. Outside-month / disabled: dimmed.
- Month/year nav controls + level (month/year) buttons styled to match.

### 3. Migration — 26 sites across 12 files

Swap `<TextInput type="date" …>` → `<DateField …>`:

- Controlled sites: `onChange={(e) => set(e.currentTarget.value)}` → `onChange={(v) => set(v ?? '')}`.
- `getInputProps` sites: spread unchanged.
- `min` / `max` → `minDate` / `maxDate`.
- Preserve each site's existing `label`, `leftSection`, `className`, width wrappers.

Files: `purchase-orders/components/PurchaseOrderListView.tsx`,
`purchase-orders/components/PurchaseOrderForm.tsx`,
`purchase-orders/components/LotModal.tsx`,
`purchase-orders/components/SupplierConfirmationModal.tsx`,
`tasks/components/TaskFormModal.tsx`,
`delivery-orders/components/CreateShipmentFromDoModal.tsx`,
`shipments/page.tsx`,
`shipments/components/CreateDtoFromShipmentModal.tsx`,
`shipments/components/ShipmentMilestonesPanel.tsx`,
`shipments/components/ShipmentListView.tsx`,
`shipments/components/ShipmentCarrierDoPanel.tsx`,
`entities/logistics/ui/UpdateOrderForms.tsx`.

## Testing / verification

- `npm run typecheck` clean.
- `npm run test` (existing 82 tests) green.
- New unit test: `DateField` passes a string value through and emits a string on change.
- Manual: confirm PO and shipment filter rows do not shift; calendar opens anchored under
  the box in light and dark themes.

## Out of scope

- No change to stored value format (stays ISO `'YYYY-MM-DD'`).
- No range pickers / date-time pickers (YAGNI — every current field is a single date).
- No changes to filtering/validation/business logic.
