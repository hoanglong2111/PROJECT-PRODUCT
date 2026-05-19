# Calendar And Date Pattern

Use this when designing deadline, ETA/ETD, due date, warehouse entry, or planning views.

## Date Semantics

- `warehouse_deadline_date`: production requirement deadline.
- `expected_arrival_date`: forecast arrival/entry for PR.
- `eta_planned`: expected arrival at port/destination.
- `planned_entry_date`: forecast warehouse entry.
- `actual_entry_date`: actual warehouse entry.
- `due_date`: task completion deadline.

## Display Rules

- Pair dates with risk labels when deadline-sensitive.
- Show actual vs forecast when both can exist.
- Avoid ambiguous relative-only dates; include absolute dates in operational records.
- Use date range filters for planning views.

## Calendar Views

Use calendar layout for:

- customs workload by date.
- warehouse entry planning.
- task due-date planning.
- shipment ETA schedule.

Calendar cells should show counts and risk severity, not long descriptions.

## Deadline Risk

Use:

- teal for safely before deadline.
- orange for due soon.
- yellow for due today.
- red for late or forecast late.
