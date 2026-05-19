# Table Implementation Pattern

Use this when implementing dense entity tables with Mantine.

## Core Components

- `Paper` for the table container.
- `ScrollArea` for horizontal overflow.
- `Table` with `miw` for stable wide layouts.
- `Text`, `Badge`, `Group`, `Progress` for cells.
- `ActionIcon` with `Tooltip` for row actions.
- `EmptyState` when no rows match.

## Filtering

Use `useMemo` for derived filtered rows when data volume is small/mock.

For backend filtering later:

- keep filter state in URL/Zustand/local state as needed.
- include filters in query keys.
- let backend page/sort/filter large data.

## Cell Rules

- Put business code first.
- Use second line for contextual data.
- Keep relationship links grouped.
- Use badges for priority/status/risk.
- Keep row actions at the end.

## Accessibility

- Action icons need `aria-label`.
- Tooltips should describe the action.
- Table headers should be concise and meaningful.
