# Workflow Frontend Module

Use this when implementing `src/routes/Workflow.tsx`.

## Queries

Current data:

- purchase requests.
- delivery orders.
- logistics tasks.

## Row Composition

Build flow rows by matching:

- PR `linked_do_numbers` includes DO number.
- or DO `order_info.request_code` equals PR code.

Keep PRs without DO visible.

## Deep Links

Support:

- `?pr=PR-...`
- `?do=DO-...`

Show focused rows when matched; keep fallback rows usable when no focused row exists.

## Derived Values

- missing document count.
- blocked task count.
- task completion progress per DO.
- delay via `calcDelay`.

## Future Improvements

- Add PO query if workflow needs richer PO details.
- Add not-found warning for unmatched focus params.
- Add graph/swimlane only if table no longer serves workflow inspection.
