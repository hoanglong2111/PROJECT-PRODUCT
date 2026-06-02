# Calendar And Date Pattern

Use this when designing required dates, ETA/ETD, ATD/ATA, milestone actuals, task due dates, or planning views.

## Date Semantics

- `required_date`: PR or PR line needed date.
- `expected_etd`: expected PO/shipment departure.
- `expected_eta`: expected PO/shipment arrival.
- `etd`, `eta`: shipment estimated departure/arrival.
- `atd`, `ata`: shipment actual departure/arrival.
- `planned_date`: milestone planned date.
- `actual_date`: milestone actual date.
- `due_date`: task completion deadline.

## Display Rules

- Pair dates with risk labels when deadline-sensitive.
- Show actual vs forecast when both can exist.
- Avoid ambiguous relative-only dates; include absolute dates in operational records.
- Use date range filters for planning views.

## Calendar Views

Use calendar layout for:

- approval due dates.
- shipment ETA/ATA schedule.
- customs workload by date.
- milestone due dates.
- task due-date planning.

Calendar cells should show counts and risk severity, not long descriptions.

## Deadline Risk

Use:

- teal for safely before deadline.
- orange for due soon.
- yellow for due today.
- red for late or forecast late.
