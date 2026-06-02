# Drawers And Modals Pattern

Use drawers for inspection and lightweight edits. Use modals for confirmation or focused blocking decisions.

## Drawer Uses

- PR detail.
- PO detail.
- Shipment detail.
- Task detail.
- Quick linked-record inspection.

Drawer content should include:

- entity header.
- status badge.
- key fields.
- linked entity actions.
- notes/risk/blockers.

## Modal Uses

- approve/reject confirmation.
- cancel confirmation.
- PO revision confirmation.
- shipment milestone confirmation when it triggers downstream events.
- ERP retry confirmation if it can create side effects.

## Rules

- Drawer close should remove only the relevant entity query param.
- Modals should say exactly what will happen and what blocks the action.
- Avoid modal chains.
- Keep form-heavy workflows in a drawer or page-level form, not tiny modals.

## Empty State

If a deep-linked entity is missing, keep the list usable and show a warning/empty state rather than a broken drawer.
