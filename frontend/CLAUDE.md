# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm ci                   # install exact deps from lockfile
npm run dev              # Vite dev server at localhost:5173 (strictPort)
npm run typecheck        # tsc --noEmit
npm run check:boundaries # dependency-cruiser boundary validation
npm run test             # Vitest one-shot
npm run test:watch       # Vitest watch mode
npm run build            # typecheck + Vite production build
npm run verify           # boundaries + typecheck + test + build (run before PR)
```

Use npm only — no pnpm or yarn. Node >=20.19.0 required.

Set `VITE_API_URL` to the backend base URL (defaults to `http://localhost:3001/api`). See `.env.example`.

## Architecture

This is a standalone React 19 / Vite / TypeScript frontend for **KBFE GD1: Procurement & Import Tracking**. It uses Feature-Sliced Design.

### Business flow

```
PO → DO → Shipment → DTO
```

- **PO** (Purchase Order): entry point, has many DOs
- **DO** (Delivery Order): one per shipment, one-to-one with Shipment after confirmation
- **Shipment**: represents the 10-milestone international freight flow with document gates
- **DTO** (Domestic Transport Order): inland trucking / POD after customs clearance — distinct entity from DO

Do not merge DO and DTO. Do not add PR flows unless explicitly reintroduced.

Business source of truth: `../docs/offical/SOP.md`, `../docs/offical/TRD.md`, `../docs/context/PROJECT_CONTEXT.md`, `../docs/context/OPERATING_MODEL.md`.

### Source layout

```
src/
  app/           # App.tsx, routes.tsx (lazy feature imports), routeRoles.ts
  features/      # One folder per route (dashboard, delivery-orders, domestic-transport-orders,
                 #   login, master-data, not-found, profile, purchase-orders,
                 #   settings, shipments, tasks, unauthorized)
                 # Each feature: page.tsx + index.ts; feature-local components/hooks/model inside
  shared/
    api/         # axios client (axiosConfig.ts), per-domain API modules, queryKeys.ts
    auth/        # AuthContext, RequireAuth, RequireRole, useAuth, types (AppRole, AuthUser)
    components/  # AppShellLayout and other shared UI
    hooks/       # shared React hooks
    i18n/        # messages.ts (en + vi string maps), useI18n
    lib/         # low-level utilities
    model/       # shared domain types (orphan-exempt)
    navigation/  # nav config
    preferences/ # WorkspacePreferencesContext (language, appearance, density, color preset, event theme)
    stores/      # Zustand stores (masterDataStore, workspaceStore)
    theme/       # Mantine theme builder, colorPresets, eventThemes
    utils/       # pure helpers
```

### Path aliases

| Alias | Resolves to |
|---|---|
| `@` | `src/` |
| `@app` | `src/app/` |
| `@features` | `src/features/` |
| `@shared` | `src/shared/` |

Prefer aliases over deep relative imports.

### Key patterns

**Routing & auth**: All workspace routes are wrapped in `<RequireAuth>` + `<AppShellLayout>`. Role-gated routes use `<RequireRole allowedRoles={...}>`. Auth state is a `localStorage`-backed React context (`kbfe.ui.auth.user`); the current implementation is a UI stub (login derives role from email, no real API call).

**Data fetching**: TanStack Query v5 with `queryKeys.ts` as the single source of query key constants. Per-domain API modules in `src/shared/api/` call the shared `apiClient` (Axios with error-normalizing interceptor). The interceptor unwraps `errors[0].message` from the v1 error envelope.

**State**: Zustand for client-side stores (`masterDataStore`, `workspaceStore`). TanStack Query for server state.

**i18n**: `en` and `vi` message maps in `src/shared/i18n/messages.ts`. Language preference persisted to `localStorage` via `WorkspacePreferencesContext`.

**UI library**: Mantine v9 components + Tabler icons. Keep screens dense and task-focused — this is an operational supply-chain app.

### Dependency boundaries (enforced by dependency-cruiser)

- No circular imports
- No imports from `backend/` paths
- No legacy root-level imports (old `src/api`, `src/auth`, etc. paths that predate the `src/shared/` move)

### Coding style

- Two-space indentation, single quotes, semicolons
- Named exports for shared modules; `page.tsx` / `index.ts` for feature routes
- PascalCase component filenames
- Strict TypeScript (`strict: true`); no `allowJs`

### Testing

Vitest with jsdom + globals. Test files match `src/**/*.test.{ts,tsx}`. Setup file: `src/test-setup.ts`. Focus tests on selectors, query keys, theme builders, data transforms, and component behavior.
