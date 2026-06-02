# Shipment UI/UX Module

Use this when designing or changing the legacy Delivery Orders route or future Shipment route.

## Purpose

Shipment is the GD1 import tracking board. It should show where the shipment is, which milestone is next, whether documents/customs/costs/tasks are ready, and which action is blocking progress.

## Default Layout

- Page header with Workflow action.
- Optional context banner for `?shipment=`, `?po=`, or legacy `?do=`.
- Metrics: active shipments, delayed milestones, customs attention, cost pending.
- Toolbar: search, status filter, mode filter, risk-only switch.
- Wide operations table.
- Selected shipment detail surface.

## Table Columns

Recommended columns:

- shipment number.
- linked PO lines.
- mode.
- forwarder/carrier.
- B/L or AWB.
- route.
- ETA/ATA.
- milestone progress.
- customs stream.
- cost state.
- task/doc risk.
- status.
- row action.

## Detail Surface

Tabs:

- Overview
- Lines
- Milestones
- Documents
- Customs
- Costs
- Tasks
- Audit

## Risk UX

Risk reasons:

- milestone overdue.
- ETA passed without ATD.
- missing milestone document.
- customs yellow/red.
- landed cost pending.
- blocked or overdue linked task.
