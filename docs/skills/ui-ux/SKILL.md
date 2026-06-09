---
name: kbfe-uiux
description: Use when designing or refactoring KBFE GD1 ERP/SCM/logistics UI/UX for PO, DO, quotation, shipment, milestones, documents, tasks, landed cost, dashboard, workflow, or operational control-tower screens.
---

# KBFE GD1 UI/UX Skill

## Goal

Design calm, dense, task-focused ERP software for GD1 Procurement & Import Tracking. Users should scan entity, status, owner, deadline, risk, and next action quickly.

## Product Feel

- Prefer tables, filters, compact metrics, drawers, tabs, badges, alerts, progress, and timelines.
- Avoid marketing heroes, decorative copy, large empty cards, and one-note palettes.
- Use direct operational labels: PO, DO, Quotation, Shipment, ETA, ETD, ATD, ATA, B/L, AWB, landed cost, milestone, task.
- If a route still says Delivery Orders in code, label the content as DO (Delivery Order) and note legacy compatibility only in docs.

## Screen Expectations

- Dashboard: PO/DO risks, shipment risks, SLA and task workload, landed-cost attention, quotation pending response.
- Workflow: PO -> DO -> Quotation -> Shipment -> milestones -> documents/tasks/cost.
- PO detail: General Info header, items list, LOT management with drag-and-drop, revision history, supplier confirmation, DO links, shipment progress, landed cost.
- PO LOT management: visual LOT cards/columns. Drag-and-drop items between LOTs. Split LOT button. Each LOT shows its corresponding DO link.
- DO detail: origin warehouse, destination warehouse, transport type, status, delivery dates, confirm action, linked PO, linked shipment.
- DO list: all DOs grouped by PO. Each row shows PO reference, origin/destination, transport type, status.
- Quotation detail: version history sidebar, current version content, send/reject/approve actions. Page-to-page comparison view for any two versions.
- Quotation compare: side-by-side page layout showing two versions with diff highlighting for changed fields.
- Shipment detail: overview, DO lines, milestone timeline, documents (import/edit/version), Draft B/L workflow, customs stream, costs, tasks.
- Task detail: PO, stage, assignee, status, due date, blocker, linked milestone.

## Form UX Principle

Group form fields logically by human cognitive flow (the "Họ → Tên → ..." principle):

| Form | Group order |
|---|---|
| PO Create | Supplier → PO Type → Incoterm → Payment → Currency → Dates → Items → LOT |
| DO Create | Origin warehouse → Destination warehouse → Transport type → Delivery dates → Confirm |
| Quotation | Reference → Service type → Pricing → Terms → Attachments |
| Shipment | Mode → Forwarder → Carrier → B/L/AWB → Route → Dates → DO lines |

Each form section is visually grouped (card or section header) and fields are ordered from most general to most specific. This reduces cognitive load and error rate.

## Component Choices

- Table for entity lists.
- Drawer for detail inspection.
- Tabs for shipment detail sections.
- Sortable/DnD container for LOT management (drag items between LOTs).
- Timeline/Stepper for shipment milestones.
- Badge for status/priority/customs/risk.
- Progress for milestone completion and tasks.
- Alert for blockers and missing prerequisites.
- ActionIcon only with tooltip and `aria-label`.
- Side-by-side panel for quotation version comparison.

## Status And Risk

| Meaning | Color |
|---|---|
| completed/synced/delivered | teal |
| active/in progress | blue |
| waiting/pending/near deadline | yellow or orange |
| blocked/missing/late/failed | red |
| cancelled/unknown/not started | gray/dark |

Never rely on color alone; pair with text like `Missing B/L`, `Over ETA`, `Blocked`, `Approval overdue`, or `Cost pending`.

## Layout Rules

- Full-width work surfaces with readable max widths where useful.
- Cards only for metrics, repeated records, drawers/modals, and framed tools.
- Do not nest cards inside cards.
- Wide data uses horizontal scroll.
- Page headings stay compact.
- Buttons/badges must not overflow on mobile.

## Done

- Main entity and next action are visible in one scan.
- Risk says exactly why it exists.
- Deep links preserve context.
- Empty/loading/error states exist.
- Desktop and mobile remain legible.
- LOT drag-and-drop is responsive and provides visual feedback.
- Quotation comparison shows diffs clearly.
