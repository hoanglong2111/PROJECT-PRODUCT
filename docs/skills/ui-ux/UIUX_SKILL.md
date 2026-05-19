---
name: kbfe-uiux
description: Use when designing or refactoring KBFE ERP/SCM/logistics UI/UX for PR, PO, DO, documents, tasks, warehouse risk, finance/tax, dashboard, workflow, or operational control-tower screens.
---

# KBFE UI/UX Skill

## Goal

Design calm, dense, task-focused ERP software. Users should scan entity, status, owner, deadline, risk, and next action quickly.

## Load Focused References

| Need | Reference |
|---|---|
| Shell/page layout | `foundations/app-shell.md`, `foundations/page-anatomy.md` |
| Text/spacing/color/motion | `foundations/*` |
| Tables/search/buttons/tabs/drawers | `patterns/*` |
| Page-specific behavior | `modules/<page>-uiux.md` |

## Product Feel

- Prefer tables, filters, compact metrics, drawers, tabs, badges, alerts, progress, and timelines.
- Avoid marketing heroes, decorative copy, large empty cards, and one-note palettes.
- Use direct operational labels: PR, PO, DO, ETA, ETD, SAP, warehouse deadline, missing docs, blocked tasks.

## Layout Rules

- Full-width work surfaces with readable max widths where useful.
- Cards only for metrics, repeated records, drawers/modals, and framed tools.
- Do not nest cards inside cards.
- Wide data uses horizontal scroll.
- Page headings stay compact.
- Buttons/badges must not overflow on mobile.

## Status And Risk

| Meaning | Color |
|---|---|
| completed/synced/delivered | teal |
| active/in progress | blue |
| waiting/pending/near deadline | yellow or orange |
| blocked/missing/late/failed | red |
| cancelled/unknown/not started | gray/dark |

Never rely on color alone; pair with text like `Missing B/L`, `Late 3d`, `SYNC_INCOMPLETE`, or `Blocked`.

## Screen Expectations

- Dashboard: metrics, risk queue, business flow distribution.
- Workflow: PR -> PO -> DO -> Documents -> Tasks -> Warehouse.
- PR detail: demand, deadline/delay, requester/buyer, linked records, notes.
- PO detail: supplier, SAP sync, source lines, linked DO, amount.
- DO detail: overview, documents, tasks/closure, source lines; later logistics/warehouse/finance/audit.
- Task detail: DO/PR/PO links, assignee, progress, status, due date, required flag, blocker.

## Component Choices

- Table for entity lists.
- Drawer for detail inspection.
- Tabs for DO sections.
- Select/Switch for filters.
- Badge for status/priority/SAP/risk.
- Progress for task completion.
- Timeline/Stepper for shipping/workflow stage.
- Alert for blockers and missing prerequisites.
- ActionIcon only with tooltip and `aria-label`.

## Done

- The main entity and next action are visible in one scan.
- Risk says exactly why it exists.
- Deep links preserve context.
- Empty/loading/error states exist.
- Desktop and mobile remain legible.
