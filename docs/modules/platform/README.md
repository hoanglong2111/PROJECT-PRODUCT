# Platform Module

Platform docs cover modules that support GD1 but are not themselves PR/PO/shipment business flows.

## Current Runtime Modules

| Module | Purpose | Main code |
|---|---|---|
| Auth | Login/session/JWT boundary | `backend/routes/auth.routes.ts`, `frontend/src/shared/auth` |
| Users | User list and admin account management | `backend/routes/users.routes.ts` |
| Search | Cross-module entity lookup | `backend/routes/search.routes.ts` |
| Health | Runtime health check | `backend/routes/health.routes.ts` |
| Product AI Harness | Read-only GD1 copilot orchestration for app users, compact context, routing, cache, metrics | `backend/ai`, `backend/routes/ai.routes.ts`, `frontend/src/shared/components/Gd1HarnessPanel.tsx` |
| Development AI Harness | IDE/build-agent orchestration, context packs, workflows, prompt templates, readiness checks | `.agents/harness`, `AGENTS.md`, `docs/skills`, `backend/mcp/deployServer.ts` |
| Settings/Profile | User preferences, theme, language, admin UI | `frontend/src/features/settings`, `frontend/src/features/profile` |
| Exchange Rates | Currency/rate support for PO and landed cost | `backend/routes/exchange-rates.routes.ts`, `frontend/src/features/exchange-rates` |

## Boundary

- Shared platform/master-data ERDs are planning/support docs, not a replacement for the current GD1 schema.
- Product AI harness output is dry-run recommendation/risk/task-draft data until a backend write route performs authorization, idempotency, and audit.
- Development AI harness coordinates AI agents that build the repository; it does not replace backend auth, app runtime, or deployment approvals.
- Tenant isolation, auth-derived tenant context, and RLS are production hardening work tracked separately from GD1 feature CRUD.
- Do not mix future GD2/GD3 master-data expansion into current GD1 docs unless documenting an explicit dependency.
