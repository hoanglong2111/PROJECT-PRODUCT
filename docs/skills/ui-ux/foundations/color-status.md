# Color And Status Foundation

Use this for badges, alerts, table row emphasis, and risk states.

## Semantic Colors

| Meaning | Color |
|---|---|
| Completed, delivered, synced, ready | teal |
| Active, in progress, normal workflow | blue |
| Pending, due soon, waiting | yellow/orange |
| Blocked, late, missing, failed | red |
| Unknown, cancelled, inactive | gray/dark |

## Status Rules

- Pair every color with explicit text.
- Use filled red sparingly for actual late/blocking states.
- Use light red/orange for forecast risk or warnings.
- Use gray for unavailable links and unknown state.

## Risk Labels

Good:

- `Approval overdue`
- `ETA passed`
- `2 missing docs`
- `Cost pending`
- `1 blocked task`

Avoid:

- `Warning`
- `Problem`
- `Attention needed`

## Cross-Module Consistency

The same status should look the same on Dashboard, Workflow, PR, PO, Shipment, and Tasks. If a module needs special emphasis, add a reason label rather than changing the status language.
