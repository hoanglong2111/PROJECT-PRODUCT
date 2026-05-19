# Drawer Detail Pattern

Use this when implementing entity inspection drawers.

## State

- Selected entity can be local state.
- Entity id should also be reflected in query params when shareable.
- Open the drawer when a matching query param is found.

## Structure

```text
Drawer
  Entity header
  Status badge
  Key summary grid
  Risk/validation panel
  Linked records
  Notes/activity
```

## Rules

- Close should remove only the related entity param.
- Drawer body can scroll.
- Keep actions near linked records or the header.
- Use `EntityLink` for related entities.

## Missing Entity

If a query param references a missing entity, future implementation should show a warning rather than failing silently.
