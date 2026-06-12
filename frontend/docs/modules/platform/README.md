# Platform Module

Platform docs cover modules that support GD1 but are not themselves PO/DO/shipment/DTO business flows.

## Current Runtime Modules

| Module | Purpose | Main frontend area |
|---|---|---|
| Auth | Login/session/JWT boundary | `frontend/src/shared/auth` |
| Users | User list and admin account management | admin/settings area |
| Search | Cross-module entity lookup | shared search components when available |
| Health | Runtime health check | operational support |
| Settings/Profile | User preferences, theme, language, admin UI | `frontend/src/features/settings`, `frontend/src/features/profile` |
| Exchange Rates | Currency/rate support for PO, shipment cost, and landed cost | `frontend/src/features/exchange-rates` |
| API integration | Current mock API wiring and compatibility boundaries | `frontend/src/shared/api` |

## Boundary

- Tenant isolation, auth-derived tenant context, RBAC, and audit trail are production hardening requirements from SOP/TRD.
- Platform docs must not replace the current GD1 business flow.
- Do not mix future GD2/GD3 expansion into current GD1 docs unless documenting an explicit dependency.

## API Integration

See `api-integration.md` for the current frontend-to-mock-API baseline.

As of 2026-06-12:

- Master data, item master, Purchase Orders V1, PO LOT planning, and Delivery Orders V1 are wired to the Express mock-only API.
- PO LOT planning uses direct `lots[].items[]` responses and has no delivery slot layer.
- Delivery Orders still use a compatibility adapter for the existing UI shape.
- Quotation, shipment, task, and dashboard-stat screens still use UI-only compatibility data unless a matching endpoint exists in `kbi-mock-api/docs/API_CONTRACT.md`.
