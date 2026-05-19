# Buttons And Links Pattern

Use this for command hierarchy, icon buttons, and cross-entity navigation.

## Button Hierarchy

- Primary button: one main action per page header or detail surface.
- Secondary/light button: inspect related workflow or open a related module.
- Subtle icon action: repeated table row actions.
- Disabled button: missing linked entity or unavailable workflow action.

## Icons

- Use Tabler Icons to match the current codebase.
- Pair unfamiliar icons with visible labels or tooltips.
- Icon-only actions require tooltip and `aria-label`.

## Entity Links

Cross-entity links should preserve operational context:

- PR opens `/purchase-requests?pr=...`
- PO opens `/purchase-orders?po=...`
- DO opens `/delivery-orders?do=...`
- Task opens `/tasks?task=...`
- Workflow opens `/workflow?do=...` or `/workflow?pr=...`

## Command Copy

Good:

- `Inspect workflow`
- `Open DO board`
- `View closure tasks`
- `Sync SAP`

Avoid:

- vague labels like `Go`, `View`, `Click here`.
