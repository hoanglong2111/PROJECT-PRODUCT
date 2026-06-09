# Platform Module

Platform docs cover modules that support GD1 but are not themselves PO/DO/shipment business flows.

## Current Runtime Modules

| Module | Purpose | Main code |
|---|---|---|
| Auth | Login/session/JWT boundary | `backend/routes/auth.routes.ts`, `frontend/src/shared/auth` |
| Users | User list and admin account management | `backend/routes/users.routes.ts` |
| Search | Cross-module entity lookup | `backend/routes/search.routes.ts` |
| Health | Runtime health check | `backend/routes/health.routes.ts` |
| Settings/Profile | User preferences, theme, language, admin UI | `frontend/src/features/settings`, `frontend/src/features/profile` |
| Exchange Rates | Currency/rate support for PO and landed cost | `backend/routes/exchange-rates.routes.ts`, `frontend/src/features/exchange-rates` |

## Boundary

- Shared platform/master-data ERDs are planning/support docs, not a replacement for the current GD1 schema.
- Tenant isolation, auth-derived tenant context, and RLS are production hardening work tracked separately from GD1 feature CRUD.
- Do not mix future GD2/GD3 master-data expansion into current GD1 docs unless documenting an explicit dependency.
