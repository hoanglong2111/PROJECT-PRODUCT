# Frontend Agent Guidelines

This file applies only to the `frontend/` package. Keep it lean: it is a practical frontend working guide, not an autonomous workflow system.

**This is the canonical guide for every AI agent (Claude Code, Codex, and others) working in this package.** `CLAUDE.md` intentionally contains no duplicated guidance — it only points here, so there is a single source of truth to keep in sync.

## Project Scope

This is a standalone React/Vite frontend for KBFE GD1: Procurement & Import Tracking.

Business source of truth lives outside this package:

- `../docs/offical/SOP.md`
- `../docs/offical/TRD.md`
- `../docs/context/PROJECT_CONTEXT.md`
- `../docs/context/OPERATING_MODEL.md`

Current canonical GD1 flow:

```text
PO -> DO -> Shipment -> DTO
```

Use this vocabulary in new UI copy and docs:

- PO is the current frontend starting point.
- PO has many DOs.
- Each DO has exactly one Shipment after confirmation.
- DO and DTO are distinct entities.
- DTO means Domestic Transport Order and owns inland trucking/POD after shipment customs clearance.

## Project Structure

Application source lives in `src/` with a Feature-Sliced Design (FSD) layout. The
import direction is one-way: `app → features → entities → shared`.

- `src/app/` — `App.tsx`, `routes.tsx` (lazy feature imports), `routeRoles.ts`, root app shell.
- `src/features/<feature>/` — one folder per route. Each feature owns its UI and state:
  - `page.tsx` — thin orchestrator (data wiring + layout), plus `index.ts` barrel.
  - `components/` — feature-local presentational components (one unit per file, PascalCase).
  - `hooks/` — feature-local React hooks.
  - `model/` — non-React feature code: pure selectors/types/constants (`<feature>Model.ts`),
    label mappers, **and the feature's Zustand UI store** (`<feature>UiStore.ts`).
- `src/entities/<entity>/` — cross-feature domain building blocks (currently `logistics`):
  - `ui/` — domain-aware shared components (e.g. `EntityLink`, `FlowTagBadge`, `SourceLineTable`, `UpdateOrderForms`).
  - `lib/` — domain helpers (e.g. `operations`, `delay`).
  - `index.ts` — the entity's public API barrel; import entities only through it.
- `src/shared/` — domain-agnostic reusable code:
  - `api/` (axios client, per-domain API modules, `queryKeys.ts`), `auth/`, `components/`,
    `hooks/`, `i18n/` (`messages.ts`, `useI18n`), `lib/`, `model/` (shared domain types,
    orphan-exempt), `navigation/`, `preferences/`, `theme/`, `utils/`.
- `src/**/*.test.{ts,tsx}` — Vitest tests, commonly under `__tests__/`.
- `public/` — static assets such as favicons and brand images.

### Path aliases

| Alias | Resolves to |
|---|---|
| `@` | `src/` |
| `@app` | `src/app/` |
| `@features` | `src/features/` |
| `@entities` | `src/entities/` |
| `@shared` | `src/shared/` |

Prefer aliases over deep relative imports. Use relative imports within a single feature
(`./components/X`); use the alias when crossing slices.

### State management

- **Server state** → TanStack Query v5. `queryKeys.ts` is the single source of query-key
  constants. Per-domain API modules in `src/shared/api/` call the shared `apiClient` (Axios
  with an error-normalizing interceptor that unwraps `errors[0].message` from the v1 envelope).
- **Client/UI state** (search, active tab, filters) → a **per-feature Zustand store** in that
  feature's `model/<feature>UiStore.ts` with selector hooks. There is no global grab-bag store.
- Pass server data down as props; keep UI/filter state in the feature store so page and child
  views read the same store instead of prop-drilling filter state.

### Routing & auth

All workspace routes are wrapped in `<RequireAuth>` + `<AppShellLayout>`; role-gated routes
add `<RequireRole allowedRoles={...}>`. Auth state is a `localStorage`-backed React context
(key `kbfe.ui.auth.user`); the current implementation is a UI stub (login derives role from
email, no real API call).

### i18n

`en` and `vi` message maps live in `src/shared/i18n/messages.ts`, accessed via `useI18n()`.
Language preference is persisted to `localStorage` through `WorkspacePreferencesContext`.
Children should call `useI18n()` themselves rather than receiving `t`/label helpers as props.

## Package Manager And Commands

Use npm only. Do not add pnpm/yarn lockfiles or package-manager config.

- `npm ci` installs exact dependencies from `package-lock.json`.
- `npm run dev` starts the Vite development server.
- `npm run typecheck` runs TypeScript with `--noEmit`.
- `npm run check:boundaries` validates dependency rules with Dependency Cruiser.
- `npm run test` runs the Vitest suite once.
- `npm run test:watch` runs Vitest in watch mode.
- `npm run build` type-checks and creates the production Vite build.
- `npm run verify` runs boundary checks, type-checking, tests, and build.

Node `>=20.19.0` and npm 10 are expected.

## Coding Style

Use TypeScript and React function components. Follow existing style:

- two-space indentation
- single quotes
- semicolons
- named exports for shared modules
- PascalCase component filenames such as `ThemePreview.tsx`
- feature route files named `page.tsx` and `index.ts`

Keep shared logic under `src/shared`. Keep feature-specific logic inside its feature folder. Do not import from backend/server code.

There is no dedicated lint or formatter script in `package.json`; rely on TypeScript, tests, boundary checks, and existing file style.

## Dependency Boundaries (enforced by `dependency-cruiser.cjs`)

Run `npm run check:boundaries`. The rules:

- **No circular imports.**
- **No imports from `backend/` paths.**
- **No legacy root-level imports** (old `src/api`, `src/auth`, `src/entities`, etc. paths that predate the `src/shared/` move).
- **`entities/` must not import from `features/`** (`entities-no-upward-imports`).
- **`shared/` must not import from `entities/` or `features/`** (`shared-no-upward-imports`).

This enforces the one-way layering `app → features → entities → shared` automatically, so it does not rely on convention alone.

## UI Engineering Rules

- Prefer Mantine components and existing shared components before adding new primitives.
- Use Tabler icons for icon buttons and compact actions.
- Keep operational screens dense, readable, and task-focused; this is a supply-chain workflow app, not a marketing site.
- Do not add decorative UI, landing-page sections, or large hero layouts unless the product requirement explicitly asks for them.
- Keep table, filter, status, empty, loading, and error states complete for user-facing flows.
- Preserve accessibility basics: labels, button names, keyboard reachability, and readable contrast.

## Business Rules For Frontend Work

**`docs/FE_rule.md` is the canonical frontend business-rule reference** (screen
list, per-screen flow, LOT/DO/Quotation/Shipment/Customs/Carrier DO/DTO UI rules).
Read it before building or changing a screen, and update it when a rule changes;
the bullets below are orientation only and `FE_rule.md` wins on any conflict.

- PO/DO/Shipment/DTO behavior should match `../docs/context/PROJECT_CONTEXT.md` and `../docs/context/OPERATING_MODEL.md`.
- Do not add PR flows unless the product owner explicitly reintroduces PR scope.
- DO is a separate business entity between PO and Shipment: `PO 1-n DO`, `DO 1-1 Shipment`.
- DTO is Domestic Transport Order for inland trucking and must not be merged with DO.
- Shipment UI should represent the 10 milestone flow and document gates.
- DTO starts after shipment customs clearance and owns inland trucking/POD concerns.
- SLA/overdue/incident UI should preserve owner, due time, severity, and audit context.
- Landed-cost and fuel-adjustment UI should avoid silently recalculating values without showing source inputs.

## Testing Guidelines

Vitest is configured with `jsdom` and globals (see `vitest.config.ts`).

Name tests `*.test.ts` or `*.test.tsx`; place focused unit tests near the module or in `__tests__/`. Prefer deterministic tests for selectors, query keys, theme builders, data transforms, and component behavior.

Run `npm run test` before submitting focused changes. Run `npm run verify` for broader changes.

## Pull Request Guidelines

Keep commits concise and action-oriented.

Pull requests should include:

- clear description
- linked issue or task when available
- screenshots for UI changes
- notes about config changes
- verification command run, preferably `npm run verify`

## Security And Configuration

Configure the backend API URL with `VITE_API_URL`; see `.env.example`.

Do not commit secrets or local `.env` files. Keep frontend code independent from backend package imports; `dependency-cruiser.cjs` enforces this boundary.
