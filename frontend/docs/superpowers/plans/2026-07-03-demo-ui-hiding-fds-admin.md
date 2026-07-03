# Demo UI Hiding via `/fds-admin` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app hidden-by-default for customer demos, revealed in full only by visiting a secret `/fds-admin` URL, via a runtime unlock flag (replacing the build-time `VITE_DEMO_*` env overlay).

**Architecture:** A `localStorage` flag (`kbfe.demo.unlocked`) read synchronously at load decides locked (hidden, default) vs unlocked (show all). `/fds-admin` sets the flag and hard-reloads to `/`. Two hiding tools share the flag: `DEMO_HIDDEN_CAPABILITIES` (whole modules, via the existing capability gate) and `<AdminOnly>` (arbitrary in-page UI). Components keep consuming `useCan`/`<Can>` unchanged.

**Tech Stack:** React 19, React Router v6, TypeScript, Vite, Vitest (jsdom), Mantine.

## Global Constraints

- Node `>=20.19.0`; **npm only** (no pnpm/yarn).
- Frontend is backend-agnostic: **do not touch `src/shared/api`** or the API contract. This feature is a pure client/demo concern.
- `dependency-cruiser` boundaries must stay green (`npm run check:boundaries`). Allowed here: `shared/auth` → `shared/config`, `app` → `shared/*` (both already used).
- Components consume access only through `useCan` / `<Can>` / `<AdminOnly>` — never read roles or the raw flag inside feature UI (except the one `<AdminOnly>` wrap).
- No React Testing Library available — tests call functions/components directly; do not add new test deps.
- Only two URLs exist: `/` and `/fds-admin`. No `/fds-demo`, no password gate (per spec non-goals).
- Full verification before done: `npm run verify` (boundaries + typecheck + test + build) must pass.

Spec: `docs/superpowers/specs/2026-07-03-demo-ui-hiding-fds-admin-design.md`.

---

### Task 1: Swap demo overlay from build-time env to runtime unlock flag

Replaces the `VITE_DEMO_MODE`/`VITE_DEMO_HIDDEN` env overlay in `featureFlags.ts` with a `localStorage` unlock flag + a code-level hidden set, updates the one consumer (`accessPolicy.ts`), and removes the dead env declarations. Ends green (typecheck + affected tests).

**Files:**
- Modify: `src/shared/config/featureFlags.ts` (full rewrite)
- Create: `src/shared/config/featureFlags.test.ts`
- Modify: `src/shared/auth/accessPolicy.ts` (drop `env` param on `canUserAccessCapability`, remove `CapabilityEnv`)
- Modify: `src/shared/auth/accessPolicy.test.ts` (remove env-based overlay test block)
- Modify: `src/vite-env.d.ts` (remove `VITE_DEMO_*` lines)
- Modify: `.env.example` (remove demo lines)

**Interfaces:**
- Consumes: `Capability` from `@shared/auth/capabilities`.
- Produces:
  - `isDemoUnlocked(): boolean`
  - `setDemoUnlocked(unlocked: boolean): void`
  - `DEMO_HIDDEN_CAPABILITIES: Set<Capability>` (empty initially)
  - `isCapabilityDemoHidden(capability: Capability, hiddenCapabilities: ReadonlySet<Capability>, unlocked: boolean): boolean`
  - `isDemoHidden(capability: Capability): boolean`
  - `canUserAccessCapability(user, capability)` — now 2-arg (no `env`).

- [ ] **Step 1: Write the failing test** — `src/shared/config/featureFlags.test.ts`

```tsx
import { afterEach, describe, expect, it } from 'vitest';

import type { Capability } from '@shared/auth/capabilities';
import {
  isCapabilityDemoHidden,
  isDemoHidden,
  isDemoUnlocked,
  setDemoUnlocked,
} from './featureFlags';

afterEach(() => {
  window.localStorage.clear();
});

describe('demo unlock flag', () => {
  it('is locked by default and toggles via setDemoUnlocked', () => {
    expect(isDemoUnlocked()).toBe(false);
    setDemoUnlocked(true);
    expect(isDemoUnlocked()).toBe(true);
    setDemoUnlocked(false);
    expect(isDemoUnlocked()).toBe(false);
  });
});

describe('isCapabilityDemoHidden', () => {
  const hidden: ReadonlySet<Capability> = new Set<Capability>(['masterData.view']);

  it('hides a listed capability only while locked', () => {
    expect(isCapabilityDemoHidden('masterData.view', hidden, false)).toBe(true);
    expect(isCapabilityDemoHidden('masterData.view', hidden, true)).toBe(false);
  });

  it('never hides a capability that is not listed', () => {
    expect(isCapabilityDemoHidden('purchaseOrders.view', hidden, false)).toBe(false);
  });
});

describe('isDemoHidden', () => {
  it('hides nothing by default because the real hidden set is empty', () => {
    expect(isDemoHidden('masterData.view')).toBe(false);
    setDemoUnlocked(true);
    expect(isDemoHidden('masterData.view')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/config/featureFlags.test.ts`
Expected: FAIL — `isCapabilityDemoHidden`/`setDemoUnlocked`/`isDemoUnlocked` are not exported yet (import error / not a function).

- [ ] **Step 3: Rewrite `src/shared/config/featureFlags.ts`**

Replace the entire file with:

```ts
import type { Capability } from '@shared/auth/capabilities';

const DEMO_UNLOCK_STORAGE_KEY = 'kbfe.demo.unlocked';

/**
 * Capabilities hidden in the default (locked) demo view. Add a module's `*.view`
 * capability to hide that whole screen + its sidebar entry; `/fds-admin` reveals it.
 * Empty by default — arbitrary in-page UI is hidden with `<AdminOnly>` instead.
 */
export const DEMO_HIDDEN_CAPABILITIES = new Set<Capability>([]);

export function isDemoUnlocked() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(DEMO_UNLOCK_STORAGE_KEY) === '1';
}

export function setDemoUnlocked(unlocked: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  if (unlocked) {
    window.localStorage.setItem(DEMO_UNLOCK_STORAGE_KEY, '1');
    return;
  }

  window.localStorage.removeItem(DEMO_UNLOCK_STORAGE_KEY);
}

export function isCapabilityDemoHidden(
  capability: Capability,
  hiddenCapabilities: ReadonlySet<Capability>,
  unlocked: boolean,
) {
  return !unlocked && hiddenCapabilities.has(capability);
}

export function isDemoHidden(capability: Capability) {
  return isCapabilityDemoHidden(capability, DEMO_HIDDEN_CAPABILITIES, isDemoUnlocked());
}
```

- [ ] **Step 4: Update `src/shared/auth/accessPolicy.ts`**

Remove the `CapabilityEnv` type (line ~5) and the `env` parameter. The `import { isDemoHidden }` stays. Replace the `canUserAccessCapability` function with:

```ts
export function canUserAccessCapability(
  user: Pick<AuthUser, 'permissions' | 'role'>,
  capability: Capability,
) {
  return (
    knownCapabilities.has(capability) &&
    capabilitiesForUser(user).includes(capability) &&
    !isDemoHidden(capability)
  );
}
```

Also delete this now-unused line near the top of the file:

```ts
type CapabilityEnv = Parameters<typeof isDemoHidden>[1];
```

(No other change — `workspaceModules.ts` already calls `canUserAccessCapability(user, capability)` with two args.)

- [ ] **Step 5: Update `src/shared/auth/accessPolicy.test.ts`**

Delete the entire `it('applies demo hidden overlay even for admin capabilities', ...)` block (the one declaring `demoEnv` with `VITE_DEMO_MODE`/`VITE_DEMO_HIDDEN` and calling `canUserAccessCapability(admin, ..., demoEnv)`). Leave the other three `it(...)` blocks unchanged. (Demo-overlay coverage now lives in `featureFlags.test.ts`.)

- [ ] **Step 6: Remove dead env declarations**

In `src/vite-env.d.ts`, delete these two lines inside `interface ImportMetaEnv`:

```ts
  readonly VITE_DEMO_HIDDEN?: string;
  readonly VITE_DEMO_MODE?: string;
```

In `.env.example`, remove the demo block so the file is exactly:

```
VITE_API_URL=https://kbi-mockapi.onrender.com
```

- [ ] **Step 7: Run affected tests to verify they pass**

Run: `npx vitest run src/shared/config/featureFlags.test.ts src/shared/auth/accessPolicy.test.ts`
Expected: PASS (all tests in both files).

- [ ] **Step 8: Typecheck to confirm no other consumer broke**

Run: `npm run typecheck`
Expected: no errors (exit 0). This proves nothing else referenced the removed `env` param or `VITE_DEMO_*`.

- [ ] **Step 9: Commit**

```bash
git add src/shared/config/featureFlags.ts src/shared/config/featureFlags.test.ts src/shared/auth/accessPolicy.ts src/shared/auth/accessPolicy.test.ts src/vite-env.d.ts .env.example
git commit -m "feat: runtime demo unlock flag replacing VITE_DEMO_* env overlay"
```

---

### Task 2: `<AdminOnly>` component + `useDemoUnlocked` hook

The in-page hiding tool: renders its children only when unlocked. Reads `isDemoUnlocked()` directly (no React hook inside) so it stays a plain, unit-testable function.

**Files:**
- Create: `src/shared/auth/AdminOnly.tsx`
- Create: `src/shared/auth/AdminOnly.test.tsx`

**Interfaces:**
- Consumes: `isDemoUnlocked` from `@shared/config/featureFlags`.
- Produces:
  - `AdminOnly({ children }: { children: ReactNode }): JSX.Element | null`
  - `useDemoUnlocked(): boolean`

- [ ] **Step 1: Write the failing test** — `src/shared/auth/AdminOnly.test.tsx`

```tsx
import { afterEach, describe, expect, it } from 'vitest';

import { setDemoUnlocked } from '@shared/config/featureFlags';
import { AdminOnly, useDemoUnlocked } from './AdminOnly';

afterEach(() => {
  window.localStorage.clear();
});

describe('AdminOnly', () => {
  it('renders nothing while locked', () => {
    expect(AdminOnly({ children: 'secret' })).toBeNull();
  });

  it('renders its children while unlocked', () => {
    setDemoUnlocked(true);
    expect(AdminOnly({ children: 'secret' })).not.toBeNull();
  });
});

describe('useDemoUnlocked', () => {
  it('reflects the unlock flag', () => {
    expect(useDemoUnlocked()).toBe(false);
    setDemoUnlocked(true);
    expect(useDemoUnlocked()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/auth/AdminOnly.test.tsx`
Expected: FAIL — cannot resolve `./AdminOnly`.

- [ ] **Step 3: Create `src/shared/auth/AdminOnly.tsx`**

```tsx
import type { ReactNode } from 'react';

import { isDemoUnlocked } from '@shared/config/featureFlags';

/**
 * Convenience hook for logic-level checks. Unlock only changes via a hard reload
 * (see `/fds-admin`), so no reactive subscription is needed.
 */
export function useDemoUnlocked() {
  return isDemoUnlocked();
}

/**
 * Renders its children only when the browser is unlocked via `/fds-admin`.
 * Use for arbitrary in-page UI that must be hidden from customers regardless of role.
 */
export function AdminOnly({ children }: { children: ReactNode }) {
  if (!isDemoUnlocked()) {
    return null;
  }

  return <>{children}</>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/auth/AdminOnly.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/shared/auth/AdminOnly.tsx src/shared/auth/AdminOnly.test.tsx
git commit -m "feat: AdminOnly component + useDemoUnlocked hook for in-page demo hiding"
```

---

### Task 3: `/fds-admin` unlock route

A public route that sets the unlock flag and hard-reloads to `/`. The side effect is extracted into an injectable function so it is testable without jsdom navigation.

**Files:**
- Create: `src/shared/auth/FdsAdminRoute.tsx`
- Create: `src/shared/auth/FdsAdminRoute.test.ts`
- Modify: `src/app/routes.tsx` (register the public route)

**Interfaces:**
- Consumes: `setDemoUnlocked` from `@shared/config/featureFlags`.
- Produces:
  - `activateDemoUnlock(redirect?: () => void): void` — sets the flag, then calls `redirect` (default: `window.location.replace('/')`).
  - `FdsAdminRoute(): null` — route component that runs `activateDemoUnlock()` on mount.

- [ ] **Step 1: Write the failing test** — `src/shared/auth/FdsAdminRoute.test.ts`

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isDemoUnlocked } from '@shared/config/featureFlags';
import { activateDemoUnlock } from './FdsAdminRoute';

afterEach(() => {
  window.localStorage.clear();
});

describe('activateDemoUnlock', () => {
  it('sets the unlock flag and triggers the redirect', () => {
    const redirect = vi.fn();

    activateDemoUnlock(redirect);

    expect(isDemoUnlocked()).toBe(true);
    expect(redirect).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/auth/FdsAdminRoute.test.ts`
Expected: FAIL — cannot resolve `./FdsAdminRoute`.

- [ ] **Step 3: Create `src/shared/auth/FdsAdminRoute.tsx`**

```tsx
import { useEffect } from 'react';

import { setDemoUnlocked } from '@shared/config/featureFlags';

export function activateDemoUnlock(redirect: () => void = () => window.location.replace('/')) {
  setDemoUnlocked(true);
  redirect();
}

/**
 * Secret unlock route. Visiting `/fds-admin` flips the app into the full (unlocked)
 * view and reloads to `/`. Not linked anywhere in the UI.
 */
export function FdsAdminRoute() {
  useEffect(() => {
    activateDemoUnlock();
  }, []);

  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/auth/FdsAdminRoute.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Register the route in `src/app/routes.tsx`**

Add this import near the other `@shared/auth` imports:

```tsx
import { FdsAdminRoute } from '@shared/auth/FdsAdminRoute';
```

Add the route to the `publicRoutes` array (which currently holds `/login` and `/unauthorized`):

```tsx
const publicRoutes: RouteConfig[] = [
  { path: '/login', element: <Login /> },
  { path: '/unauthorized', element: <Unauthorized /> },
  { path: '/fds-admin', element: <FdsAdminRoute /> },
];
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: no errors (exit 0).

- [ ] **Step 7: Commit**

```bash
git add src/shared/auth/FdsAdminRoute.tsx src/shared/auth/FdsAdminRoute.test.ts src/app/routes.tsx
git commit -m "feat: /fds-admin route unlocks the full UI"
```

---

### Task 4: Hide the `fds-do` tab with `<AdminOnly>` (first consumer)

Wrap the `fds-do` tab control and its panel in `ShipmentDetailView.tsx` so they are hidden in the default demo view and revealed via `/fds-admin`. Verified by typecheck/build + manual check (rendering gate is unit-covered by Task 2).

**Files:**
- Modify: `src/features/shipments/components/ShipmentDetailView.tsx`

**Interfaces:**
- Consumes: `AdminOnly` from `@shared/auth/AdminOnly`.

- [ ] **Step 1: Import `AdminOnly`**

Add to the imports block (near `import { StatusBadge } from '@shared/components/StatusBadge';`):

```tsx
import { AdminOnly } from '@shared/auth/AdminOnly';
```

- [ ] **Step 2: Wrap the `fds-do` tab control**

Replace the tab (currently lines ~120-122):

```tsx
          <Tabs.Tab value="fds-do" leftSection={<IconFileInvoice size={14} />}>
            {t('shipments.fdsDo')}
          </Tabs.Tab>
```

with:

```tsx
          <AdminOnly>
            <Tabs.Tab value="fds-do" leftSection={<IconFileInvoice size={14} />}>
              {t('shipments.fdsDo')}
            </Tabs.Tab>
          </AdminOnly>
```

- [ ] **Step 3: Wrap the `fds-do` panel**

Replace the panel (currently lines ~178-181, including its comment):

```tsx
        {/* FDS-only permissions are deferred; UI is visible for now. */}
        <Tabs.Panel value="fds-do" pt="sm">
          <ShipmentCarrierDoPanel shipment={shipment} />
        </Tabs.Panel>
```

with:

```tsx
        {/* FDS-only tab: hidden in the demo view, revealed via /fds-admin. */}
        <AdminOnly>
          <Tabs.Panel value="fds-do" pt="sm">
            <ShipmentCarrierDoPanel shipment={shipment} />
          </Tabs.Panel>
        </AdminOnly>
```

- [ ] **Step 4: Typecheck + build**

Run: `npm run build`
Expected: `tsc --noEmit` passes and Vite build succeeds (exit 0).

- [ ] **Step 5: Manual check**

Run: `npm run dev`, then in the browser:
1. Open a shipment detail at `/shipments` → confirm **no** `FDS DO` tab is visible.
2. Visit `/fds-admin` → you are redirected to `/` and stay logged in.
3. Reopen the same shipment detail → the `FDS DO` tab **is now visible**.
Expected: matches the above. (To reset to the hidden view: clear site data or use an incognito window.)

- [ ] **Step 6: Commit**

```bash
git add src/features/shipments/components/ShipmentDetailView.tsx
git commit -m "feat: hide FDS DO shipment tab behind /fds-admin demo unlock"
```

---

### Task 5: Full verification

Confirm the whole feature is green end-to-end and the demo behavior holds.

**Files:** none (verification only).

- [ ] **Step 1: Run the full verification suite**

Run: `npm run verify`
Expected: `check:boundaries` (0 violations) → `typecheck` (0 errors) → `test` (all files pass, incl. `featureFlags.test.ts`, `AdminOnly.test.tsx`, `FdsAdminRoute.test.ts`, `accessPolicy.test.ts`) → `build` (success). Exit 0.

- [ ] **Step 2: Manual demo smoke test**

Run: `npm run dev` and verify:
1. Fresh browser (or incognito) at `/` → default view; `FDS DO` tab hidden.
2. `/fds-admin` → redirect to `/`, full UI; `FDS DO` tab visible; persists across reload.
3. `git grep -n "VITE_DEMO" src` returns nothing (env overlay fully removed).
Expected: all hold.

- [ ] **Step 3: Final commit (if any residual changes)**

```bash
git add -A
git commit -m "chore: verify demo UI hiding via /fds-admin" --allow-empty
```

---

## Notes

- **Resetting to the hidden view:** intentionally there is no `/fds-demo`. Clear site data or use incognito. Demo machines simply never visit `/fds-admin`.
- **Hiding a whole screen later:** add its `*.view` capability (e.g. `masterData.view`) to `DEMO_HIDDEN_CAPABILITIES` in `featureFlags.ts` — the sidebar entry and route guard already key off it.
- **Hiding another in-page element later:** wrap it in `<AdminOnly>` (buttons, columns, sections, tabs).
