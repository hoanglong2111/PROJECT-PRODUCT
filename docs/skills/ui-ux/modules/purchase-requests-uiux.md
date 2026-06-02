# Purchase Requests UI/UX Module

Use this when designing or changing the Purchase Requests route.

## Purpose

PR pages help users inspect demand, approval state, required date, estimated value, and conversion to PO.

## Default Layout

- Page header with Workflow action.
- Optional context banner for `?pr=`.
- Metrics: total PR, pending approval, approved, partially converted.
- Toolbar: search, status filter, approval filter, conversion filter.
- Main table.
- Detail drawer.

## Table Columns

Recommended columns:

- PR code + priority.
- title.
- requester/department.
- required date.
- total amount + currency.
- approval status.
- conversion progress.
- risk.
- row action.

## Detail Drawer

Show:

- PR header.
- line items.
- approval chain/status.
- conversion progress.
- linked POs.
- notes/audit.

## Risk UX

- Approval overdue is red.
- Rejected needs clear next action: revise or cancel.
- Partial conversion is not an error; show remaining quantity.
