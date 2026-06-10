# Frontend Agent Guidelines

This file applies only to the `frontend/` package. Keep it lean: it is a practical frontend working guide, not an autonomous workflow system.

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

Application source lives in `src/` with a feature-sliced layout:

- `src/app/` contains routing, role configuration, and the root app shell.
- `src/features/<feature>/` contains page-level feature modules, usually with `page.tsx` and `index.ts`.
- `src/shared/` contains reusable API clients, auth, components, hooks, i18n, models, stores, theme, and utilities.
- `src/**/*.test.{ts,tsx}` holds Vitest tests, commonly under `__tests__/`.
- `public/` contains static assets such as favicons and brand images.

Use aliases (`@`, `@app`, `@features`, `@shared`) instead of deep relative imports where practical.

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

## UI Engineering Rules

- Prefer Mantine components and existing shared components before adding new primitives.
- Use Tabler icons for icon buttons and compact actions.
- Keep operational screens dense, readable, and task-focused; this is a supply-chain workflow app, not a marketing site.
- Do not add decorative UI, landing-page sections, or large hero layouts unless the product requirement explicitly asks for them.
- Keep table, filter, status, empty, loading, and error states complete for user-facing flows.
- Preserve accessibility basics: labels, button names, keyboard reachability, and readable contrast.

## Business Rules For Frontend Work

- PO/DO/Shipment/DTO behavior should match `../docs/context/PROJECT_CONTEXT.md` and `../docs/context/OPERATING_MODEL.md`.
- Do not add PR flows unless the product owner explicitly reintroduces PR scope.
- DO is a separate business entity between PO and Shipment: `PO 1-n DO`, `DO 1-1 Shipment`.
- DTO is Domestic Transport Order for inland trucking and must not be merged with DO.
- Shipment UI should represent the 10 milestone flow and document gates.
- DTO starts after shipment customs clearance and owns inland trucking/POD concerns.
- SLA/overdue/incident UI should preserve owner, due time, severity, and audit context.
- Landed-cost and fuel-adjustment UI should avoid silently recalculating values without showing source inputs.

## Testing Guidelines

Vitest is configured with `jsdom`, globals, and `src/test-setup.ts`.

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
