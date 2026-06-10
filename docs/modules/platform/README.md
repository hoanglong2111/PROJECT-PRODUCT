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

## Boundary

- Tenant isolation, auth-derived tenant context, RBAC, and audit trail are production hardening requirements from SOP/TRD.
- Platform docs must not replace the current GD1 business flow.
- Do not mix future GD2/GD3 expansion into current GD1 docs unless documenting an explicit dependency.
