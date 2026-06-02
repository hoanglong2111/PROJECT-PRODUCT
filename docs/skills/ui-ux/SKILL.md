---
name: kbfe-uiux
description: Use when designing or refactoring KBFE GD1 ERP/SCM/logistics UI/UX for PR, approval, PO, shipment, milestones, documents, tasks, landed cost, dashboard, workflow, or operational control-tower screens.
---

# KBFE GD1 UI/UX Skill

## Goal

Design calm, dense, task-focused ERP software for GD1 Procurement & Import Tracking. Users should scan entity, status, owner, deadline, risk, and next action quickly.

## Product Feel

- Prefer tables, filters, compact metrics, drawers, tabs, badges, alerts, progress, and timelines.
- Avoid marketing heroes, decorative copy, large empty cards, and one-note palettes.
- Use direct operational labels: PR, PO, Shipment, ETA, ETD, ATD, ATA, B/L, AWB, landed cost, approval, milestone, task.
- If a route still says Delivery Orders, label the content as Shipment where possible and note legacy compatibility only in docs.

## Screen Expectations

- Dashboard: PR approvals, PO/shipment risks, SLA and task workload, landed-cost attention.
- Workflow: PR -> PO -> Shipment -> milestones -> documents/tasks/cost.
- PR detail: header, lines, approval status, required date, conversion progress.
- PO detail: supplier, revision, source PR lines, shipment progress, ETA/ETD, landed cost.
- Shipment detail: overview, PO lines, milestone timeline, documents, customs stream, costs, tasks.
- Task detail: PO, stage, assignee, status, due date, blocker, linked milestone.

## Component Choices

- Table for entity lists.
- Drawer for detail inspection.
- Tabs for shipment detail sections.
- Timeline/Stepper for shipment milestones.
- Badge for status/priority/customs/risk.
- Progress for conversion, milestone completion, and tasks.
- Alert for blockers and missing prerequisites.
- ActionIcon only with tooltip and `aria-label`.

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
