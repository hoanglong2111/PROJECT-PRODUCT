# Tables And Lists Pattern

Use tables for dense operational records. Use lists/cards only when the entity count is low or content is narrative.

## Table Anatomy

- Identifier column first.
- Relationship columns near the identifier: PR/PO/DO links.
- Operational state next: status, risk, owner.
- Time/deadline columns close to risk.
- Row action at the far right.

## Table Rules

- Use two-line cells for code + description.
- Keep row actions compact with tooltip and aria-label.
- Use `ScrollArea` or equivalent horizontal overflow for wide data.
- Show an EmptyState when filters match nothing.
- Show Skeletons or Loader for loading states.

## List Rules

Use list layout for:

- risk queue.
- module links.
- compact workload summaries.
- timeline events.

Lists should still expose entity id, status, deadline, and owner when relevant.

## Bad Table Smells

- More than one primary action per row.
- Hidden risk reasons behind only color.
- Long paragraphs inside table cells.
- Columns that repeat the same value for every row.
