# Demo UI hiding via `/fds-admin` — Design

Date: 2026-07-03
Status: Approved (design)

## Context / Problem

When demoing KBFE to customers, some UI must be hidden (screens/tabs/buttons not
ready for customer eyes). The current implementation hides UI through a **build-time**
env overlay (`VITE_DEMO_MODE` + `VITE_DEMO_HIDDEN` read via `import.meta.env`). That is
baked at build time, so changing what is hidden requires a rebuild/redeploy and cannot be
toggled per session. It also only works at the capability level (whole modules), with no
simple tool for arbitrary in-page elements like a single tab.

We want the **safest default for demos**: the app is hidden-by-default everywhere, and the
internal team reveals the full UI by visiting a secret URL. It must stay **frontend-first**
and swap cleanly to a real API later (this feature is a pure frontend/demo concern that must
not entangle the API contract).

## Goals

- Default view (root `/`, on both Vercel `https://project-product-tau.vercel.app/` and
  `localhost`) = **hidden** demo-safe UI.
- Visiting `/fds-admin` = **reveal all UI** (unlock), persisted so normal navigation stays
  full without re-typing the URL.
- Two hiding tools with clear granularity: whole-module hiding, and arbitrary in-page hiding.
- No rebuild to change unlock state. No Vercel config change (SPA rewrite already covers it).
- Components stay unchanged in how they consume access (`useCan` / `<Can>`), plus one new
  simple primitive.

## Non-goals

- Not a security boundary. `/fds-admin` is an unlisted URL with a client-side flag; anyone
  who knows the path can unlock. Acceptable for non-technical customer demos (confirmed).
- No password/passphrase gate, no Vercel Password Protection.
- No `/fds-demo` re-lock route. Re-locking a browser that already unlocked is done by
  clearing site data / using an incognito window. In practice the demo machine simply never
  visits `/fds-admin`, so it stays hidden.
- Does not decide *which* specific UI to hide beyond the worked example; the hidden list and
  wrap sites are filled in incrementally by the team.

## Approach chosen

"Safe-by-default, runtime unlock." Replace the build-time env overlay with a runtime
`localStorage` unlock flag toggled by a single secret route, and expose two composable
hiding tools that both read that flag.

### 1. Unlock flag (runtime)

- localStorage key `kbfe.demo.unlocked`. Absent/`!== '1'` = locked (hidden, default);
  `'1'` = unlocked (show all).
- `isDemoUnlocked()` in `src/shared/config/featureFlags.ts` reads it synchronously (guard
  `typeof window`), so first paint already reflects the correct state — no flash.
- State changes only via a hard navigation to `/fds-admin` (full reload), so no reactive
  store/subscription is needed; `isDemoUnlocked()` is read fresh on load.

### 2. Secret route `/fds-admin`

- A public route (registered next to `/login`, `/unauthorized` in `src/app/routes.tsx`),
  no auth required, no link anywhere in the UI.
- Its component sets `localStorage['kbfe.demo.unlocked'] = '1'` then
  `window.location.replace('/')`. Result: full UI everywhere, persisted across reloads.
- Only `/` and `/fds-admin` exist. No re-lock route (see non-goals).

### 3. Gate formula (single edit point)

In `featureFlags.ts`:
```
isDemoHidden(cap) = !isDemoUnlocked() && DEMO_HIDDEN_CAPABILITIES.has(cap)
```
`AuthContext.can` and `accessPolicy.canUserAccessCapability` keep composing:
```
can(cap) = hasPermission(cap) && !isDemoHidden(cap)
```
When unlocked, `isDemoHidden` is always false → everything the role allows is shown.
When locked (default), capabilities in the hidden set are removed → nav + routes + any
`<Can>`-gated element for those capabilities disappear.

### 4. Two hiding tools (different granularity, same flag)

**a. `DEMO_HIDDEN_CAPABILITIES` — whole modules (screen + sidebar item).**
A constant `Set<Capability>` (array) in `featureFlags.ts`. Because the sidebar
(`workspaceModules`) and route guards (`routeCapabilities` → `RequireCapability`) already
key off a module's `*.view` capability, adding e.g. `masterData.view` to this set hides that
module's nav entry and blocks its route by default; `/fds-admin` reveals it. Starts empty;
the team fills it in.

**b. `<AdminOnly>` — arbitrary in-page UI (tab / button / column / section).**
For UI that has no role meaning and should simply be hidden from customers. New component in
`src/shared/auth/AdminOnly.tsx` (co-located with `Can`/`useCan`; imports `isDemoUnlocked`
from `@shared/config/featureFlags`, same direction `accessPolicy` already imports):
```tsx
export function AdminOnly({ children }: { children: ReactNode }) {
  return isDemoUnlocked() ? <>{children}</> : null;
}
// plus hook: useDemoUnlocked() => boolean, for logic-level checks
```
Renders children only when unlocked. No capability, no policy edit.

Decision rule for authors:
- Role-based visibility → `<Can capability="…">`.
- "Hide from customers regardless of role" → `<AdminOnly>` (in-page) or add the module
  capability to `DEMO_HIDDEN_CAPABILITIES` (whole screen).

### 5. Worked example — hide the `fds-do` tab

File `src/features/shipments/components/ShipmentDetailView.tsx`. The `fds-do` tab is marked
"FDS-only permissions are deferred; UI is visible for now" → no role meaning → use
`<AdminOnly>`. Wrap both the tab control and its panel:

```tsx
// tab (currently lines 120-122)
<AdminOnly>
  <Tabs.Tab value="fds-do" leftSection={<IconFileInvoice size={14} />}>
    {t('shipments.fdsDo')}
  </Tabs.Tab>
</AdminOnly>

// panel (currently lines 179-181)
<AdminOnly>
  <Tabs.Panel value="fds-do" pt="sm">
    <ShipmentCarrierDoPanel shipment={shipment} />
  </Tabs.Panel>
</AdminOnly>
```
Locked `/` → tab hidden; `/fds-admin` → tab shown. Mantine Tabs handles conditionally
rendered tabs; default active tab is `overview`, so no broken-selection edge case.

### 6. Remove build-time env overlay

- Delete `VITE_DEMO_MODE` and `VITE_DEMO_HIDDEN` from `featureFlags.ts`, `src/vite-env.d.ts`,
  and `.env.example` ("always hidden by default" needs no build flag; the hidden list is now
  a code constant).

## Components / files touched

| File | Change |
|---|---|
| `src/shared/config/featureFlags.ts` | Replace env reads with `isDemoUnlocked()`, `DEMO_HIDDEN_CAPABILITIES` constant, `isDemoHidden(cap)` factoring unlock |
| `src/shared/auth/AdminOnly.tsx` (new) | `<AdminOnly>` + `useDemoUnlocked()` |
| `src/app/routes.tsx` | Register public route `/fds-admin` (sets flag → `replace('/')`) |
| `src/features/shipments/components/ShipmentDetailView.tsx` | Wrap `fds-do` tab + panel in `<AdminOnly>` (first consumer / example) |
| `src/vite-env.d.ts`, `.env.example` | Drop `VITE_DEMO_MODE` / `VITE_DEMO_HIDDEN` |
| `src/shared/auth/accessPolicy.test.ts` (and any demo-overlay test) | Update to unlock-flag model |

`AuthContext.can` / `accessPolicy.canUserAccessCapability` are unchanged in shape — they call
the updated `isDemoHidden`. Feature pages already migrated to `useCan`/`<Can>` are untouched.
Vercel: no change (`vercel.json` already rewrites non-file paths to `index.html`).

## Data flow

1. Browser loads app → `isDemoUnlocked()` reads localStorage once.
2. Locked (default): `can(cap)` hides capabilities in `DEMO_HIDDEN_CAPABILITIES`; `<AdminOnly>`
   renders nothing. Sidebar/routes/tabs reflect the demo-safe view.
3. User navigates to `/fds-admin` → flag set → hard redirect to `/` → reload → unlocked →
   full UI everywhere, persisted.

## Error / edge handling

- SSR / no `window`: `isDemoUnlocked()` returns `false` (locked) safely.
- Corrupt/unknown localStorage value: treated as locked (only exact `'1'` unlocks).
- Mantine Tabs with a hidden tab: safe because default active tab is `overview`; hidden tabs
  are simply not rendered.
- Unlock persists intentionally; re-lock = clear site data / incognito (documented).

## Testing

- Unit (`featureFlags`): `isDemoHidden(cap)` true when locked & cap in set; false when
  unlocked; false when cap not in set. `isDemoUnlocked()` reads the flag; unknown value = locked.
- Unit (`accessPolicy`): `canUserAccessCapability` hides `DEMO_HIDDEN_CAPABILITIES` members
  when locked (even for ADMIN) and reveals them when unlocked. Replaces the old
  `VITE_DEMO_HIDDEN` env-based test.
- Component: `<AdminOnly>` renders children only when unlocked (toggle localStorage in test).
- Manual: root `/` hides configured UI (incl. `fds-do` tab); `/fds-admin` reveals all and
  persists across reload; direct-nav to a demo-hidden module route redirects to
  `/unauthorized` when locked.
- Regression: `npm run verify` (boundaries + typecheck + test + build) green.

## Notes for future real-API swap

This feature is frontend-only and orthogonal to the API contract. `isDemoUnlocked()` and
`<AdminOnly>` do not touch `src/shared/api`. When the real backend arrives, capability
resolution still flows through `AuthContext` (`permissions ?? role policy`); the demo unlock
remains a pure client concern and can be removed independently without contract changes.
