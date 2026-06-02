# Tabs Pattern

Use tabs for related detail sections inside one selected entity, not as a replacement for app navigation.

## Good Uses

- Shipment detail: Overview, Lines, Milestones, Documents, Customs, Costs, Tasks, Audit.
- PO detail: Overview, Lines, Shipments, Tasks, Costs, Audit.
- PR detail: Overview, Lines, Approval, Linked POs, Notes, Audit.
- Task detail: Overview, Activity, Related Entity.

## Rules

- Keep tab labels short.
- Use icons only when they improve scanning.
- Default tab should answer the user's first question.
- Do not hide critical blockers only in a non-default tab; surface blockers in the header or alert too.

## Tab Content

- Overview: summary and next action.
- Milestones: shipment timeline and actual dates.
- Documents: checklist/readiness/upload when supported.
- Costs: landed-cost components and allocation.
- Tasks: stage task progress and blockers.
- Audit: status/field changes.

## Responsive

If tab labels overflow, allow horizontal scrolling rather than wrapping into multiple rows.
