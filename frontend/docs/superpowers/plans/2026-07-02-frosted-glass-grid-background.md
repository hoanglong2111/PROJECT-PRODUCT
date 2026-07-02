# Frosted-Glass Grid Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the shared app background clearly noticeable in a data-dense UI by switching the decorative dot-grid to a full line grid that spans the whole viewport, and frosting the navbar/header so the grid reads *through* the app chrome.

**Architecture:** Pure-CSS, token-driven. The existing fixed `body::before` decorative layer (behind `#root`, `z-index:0`) is rewritten from radial-dots to `repeating-linear-gradient` lines with its fade mask removed so it is uniform full-height. The navbar and header are made translucent (frosted glass + `backdrop-filter` blur) via a new `--kbfe-glass-surface` token so the grid shows through the chrome. Dense content surfaces, menus, and modals are deliberately left opaque. All light/dark/visual-theme/preset switching keeps working through the existing `<html data-kbfe-*>` token cascade — no JS.

**Tech Stack:** Vite + React 19 + Mantine v9. Global CSS in `src/theme.css` (design tokens) and `src/styles/*.css` (global classes). No CSS Modules.

## Global Constraints

- **npm only.** Node `>=20.19.0`. Commands run from `PROJECT-PRODUCT/frontend/`.
- **CSS-only change.** No `.ts`/`.tsx` edits, no new deps, no JS. `main.tsx`, `AppShellLayout.tsx`, and all feature components stay untouched.
- **No new dependency-boundary surface** — nothing for `dependency-cruiser` to flag.
- **Preserve existing accessibility guards:** the decorative layer stays disabled in high-contrast mode; the frosted chrome must stay **opaque with no blur** in high-contrast mode. Reduced-motion needs no new handling (the layer is fully static; plan 1 already removed it from the reduced-motion block).
- **Verification is visual + build.** There are no unit tests for global CSS. Each task ends with `npm run build` passing and a visual check across the theme matrix, then a commit.
- Do not lower the global `--kbfe-surface-elevated` token — it also feeds menus, tooltips, popovers, and modals, which must remain opaque over page content.

---

### Task 1: Line grid, full-viewport (dot → grid, remove fade)

Replace the radial-dot texture with a two-tier line grid (fine minor lines + fainter-but-heavier major lines every 5th) and remove the mask fade so the grid is present at full strength top-to-bottom. Rename the now-misnamed `--kbfe-decorative-dot-color` token to `--kbfe-decorative-grid-color` and add a major-line token. The token rename and its consumer must land together or the grid var resolves to `transparent`.

**Files:**
- Modify: `src/theme.css:228` (rename token, add major-line token)
- Modify: `src/styles/base.css:32-42` (`body::before` rewrite)

**Interfaces:**
- Produces: CSS custom properties `--kbfe-decorative-grid-color` and `--kbfe-decorative-grid-major`, both consumed only by `body::before` in `base.css`. Replaces the removed `--kbfe-decorative-grid-color`'s predecessor `--kbfe-decorative-dot-color`.

- [ ] **Step 1: Rename the dot token and add the major-line token in `src/theme.css`**

Replace line 228:

```css
  --kbfe-decorative-dot-color: color-mix(in srgb, var(--kbfe-border-strong) 42%, transparent);
```

with:

```css
  --kbfe-decorative-grid-color: color-mix(in srgb, var(--kbfe-border-strong) 30%, transparent);
  --kbfe-decorative-grid-major: color-mix(in srgb, var(--kbfe-border-strong) 46%, transparent);
```

(Lines read heavier than dots, so the minor value is a touch lower than the old dot 42%. Both are theme-aware via `--kbfe-border-strong`, so they auto-adapt to light/dark and every visual theme. These two percentages are the tuning knobs for grid strength.)

- [ ] **Step 2: Rewrite `body::before` in `src/styles/base.css` from dots to a line grid, removing the mask**

Replace the whole `body::before` rule (lines 32-42):

```css
body::before {
  position: fixed;
  inset: 0;
  z-index: var(--kbfe-z-background-texture);
  content: "";
  pointer-events: none;
  background-image: radial-gradient(circle at center, var(--kbfe-decorative-dot-color) 1px, transparent 1.6px);
  background-size: 22px 22px;
  opacity: 0.5;
  mask-image: linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0.72) 36%, transparent 100%);
}
```

with:

```css
body::before {
  position: fixed;
  inset: 0;
  z-index: var(--kbfe-z-background-texture);
  content: "";
  pointer-events: none;
  /* Blueprint line grid: major lines (listed first so they paint on top at
     intersections) every 110px, fine minor lines every 22px. No mask — the grid
     spans the full viewport so it stays visible on tall/scrolled screens. The
     ::after spotlight still gives the top a gentle glow. */
  background-image:
    repeating-linear-gradient(0deg, var(--kbfe-decorative-grid-major) 0 1px, transparent 1px 110px),
    repeating-linear-gradient(90deg, var(--kbfe-decorative-grid-major) 0 1px, transparent 1px 110px),
    repeating-linear-gradient(0deg, var(--kbfe-decorative-grid-color) 0 1px, transparent 1px 22px),
    repeating-linear-gradient(90deg, var(--kbfe-decorative-grid-color) 0 1px, transparent 1px 22px);
  opacity: 0.6;
}
```

(`22px` cell size and `opacity: 0.6` are tuning knobs — adjust in-browser. `110px` = 5 × 22px keeps major lines aligned to the minor grid.)

- [ ] **Step 3: Verify the build passes**

Run: `npm run build`
Expected: PASS — typecheck + Vite production build complete with no errors (CSS-only change).

- [ ] **Step 4: Visual check**

Run: `npm run dev` and open http://localhost:5173.
Expected: a faint line grid is now visible across the whole page background — including the lower part of long/scrolled screens (no more fade-out). Confirm nothing references the old `--kbfe-decorative-dot-color` (grep should return no hits):

Run: `grep -rn "decorative-dot-color" src/`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/theme.css src/styles/base.css
git commit -m "feat(bg): full-viewport line grid (dot->grid, remove fade)"
```

---

### Task 2: Frost the navbar & header so the grid reads through the chrome

Introduce a translucent `--kbfe-glass-surface` token and apply it (plus `backdrop-filter` blur) to the AppShell navbar and header, so the fixed grid shows through them as a soft frosted layer. Pin the token opaque and drop the blur in high-contrast mode so accessibility is never weakened.

**Files:**
- Modify: `src/theme.css` — add `--kbfe-glass-surface` in the `html { }` derivation block (near line 230), and pin it opaque in the high-contrast guard block (the `html[data-kbfe-visual-theme='high-contrast'] { … }` accessibility-guard block that begins ~line 319).
- Modify: `src/styles/app-shell.css:3-15` (`.mantine-AppShell-header`, `.mantine-AppShell-navbar`), plus a new high-contrast override rule.

**Interfaces:**
- Consumes: `--kbfe-surface-elevated` (existing theme token).
- Produces: `--kbfe-glass-surface` — translucent chrome surface, consumed by `.mantine-AppShell-header` and `.mantine-AppShell-navbar`.

- [ ] **Step 1: Add the glass token in `src/theme.css`**

Immediately after the grid tokens added in Task 1 (after `--kbfe-decorative-grid-major`), add:

```css
  /* Frosted chrome surface: translucent so the fixed background grid reads
     THROUGH the navbar/header. Pinned opaque in high-contrast mode below. Only
     the app chrome uses this — dense cards, menus, and modals keep the opaque
     --kbfe-surface-elevated so they never show page content through them. */
  --kbfe-glass-surface: color-mix(in srgb, var(--kbfe-surface-elevated) 72%, transparent);
```

(`72%` is the tuning knob for how strongly the grid shows through the chrome — lower = more see-through.)

- [ ] **Step 2: Pin the glass token opaque in the high-contrast guard block**

Inside the existing `html[data-kbfe-visual-theme='high-contrast'] { … }` accessibility-guard block in `src/theme.css` (the one starting ~line 319, right after the `html[data-kbfe-resolved-color-scheme='dark']` block, whose first line is `--kbfe-background-primary: var(--kbfe-background-primary-base);`), add:

```css
  --kbfe-glass-surface: var(--kbfe-surface-elevated);
```

- [ ] **Step 3: Frost the header and navbar in `src/styles/app-shell.css`**

Replace the `.mantine-AppShell-header` and `.mantine-AppShell-navbar` rules (lines 3-15):

```css
.mantine-AppShell-header {
  border-bottom-color: var(--kbfe-border-primary);
  background: color-mix(in srgb, var(--kbfe-surface-elevated) 88%, var(--kbfe-background-secondary) 12%);
  box-shadow: 0 1px 0 color-mix(in srgb, var(--kbfe-background-secondary) 78%, transparent);
  backdrop-filter: blur(14px) saturate(1.08);
}

.mantine-AppShell-navbar {
  border-right-color: var(--kbfe-border-primary);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--kbfe-surface-elevated) 94%, var(--kbfe-background-secondary) 6%), var(--kbfe-background-secondary));
  box-shadow: inset -1px 0 0 color-mix(in srgb, var(--kbfe-background-secondary) 64%, transparent);
}
```

with:

```css
.mantine-AppShell-header {
  border-bottom-color: var(--kbfe-border-primary);
  background: var(--kbfe-glass-surface);
  box-shadow: 0 1px 0 color-mix(in srgb, var(--kbfe-background-secondary) 78%, transparent);
  backdrop-filter: blur(14px) saturate(1.08);
}

.mantine-AppShell-navbar {
  border-right-color: var(--kbfe-border-primary);
  background: var(--kbfe-glass-surface);
  box-shadow: inset -1px 0 0 color-mix(in srgb, var(--kbfe-background-secondary) 64%, transparent);
  backdrop-filter: blur(14px) saturate(1.08);
}
```

(The navbar loses its solid gradient in favor of the frosted glass look; the blur keeps nav text crisp while the grid behind softens to a frosted haze.)

- [ ] **Step 4: Add a high-contrast override for the chrome in `src/styles/app-shell.css`**

Add this rule directly after the `.mantine-AppShell-navbar` rule (belt-and-suspenders — the token is already pinned opaque in Step 2, this also kills the blur):

```css
/* High-contrast: chrome must stay fully opaque with no blur so the frosted
   effect can never reduce legibility. */
html[data-kbfe-visual-theme='high-contrast'] .mantine-AppShell-header,
html[data-kbfe-visual-theme='high-contrast'] .mantine-AppShell-navbar {
  background: var(--kbfe-surface-elevated);
  backdrop-filter: none;
}
```

- [ ] **Step 5: Verify the build passes**

Run: `npm run build`
Expected: PASS — no errors.

- [ ] **Step 6: Visual check**

Run: `npm run dev` and open http://localhost:5173.
Expected: the navbar and header are now translucent and the grid is visible (softly, frosted) running through them; nav labels and header controls stay crisp. Open a `Menu` (profile dropdown) and any modal — they must remain **opaque** (grid not visible through them).

- [ ] **Step 7: Commit**

```bash
git add src/theme.css src/styles/app-shell.css
git commit -m "feat(bg): frosted-glass navbar & header over the grid"
```

---

### Task 3: Full theme-matrix verification & tuning

Confirm the effect holds across every scheme / visual theme / color preset and tune the three knobs. This is its own task because a reviewer should gate the final visual result independently.

**Files:** none unless tuning is needed (then `src/theme.css` grid/glass percentages and/or `src/styles/base.css` `opacity`).

- [ ] **Step 1: Walk the theme matrix in the running app**

Run: `npm run dev`. Verify each of the following:
- **Light & dark** (header sun/moon toggle): grid clearly visible in the page background and softly through the chrome; readable in both.
- **Color presets** (Settings → appearance): the `::after` spotlight hue follows the primary (teal → ocean → sunset → …); grid color stays neutral.
- **Visual themes** (Settings): `standard` and `eye-comfort` show grid + frosted chrome; **high-contrast** shows a flat background and **opaque, non-blurred** navbar/header.
- **Reduced-motion** (OS setting): grid + chrome still render (static); nothing animates.
- **Readability** on a dense screen (Purchase Orders or Shipments list): rows/cards/tables stay crisp over the grid; menus and modals are opaque.

- [ ] **Step 2: Tune if needed**

If the grid is too strong/weak, adjust in `src/theme.css`: `--kbfe-decorative-grid-color` / `--kbfe-decorative-grid-major` mix % and/or `body::before` `opacity` in `src/styles/base.css`. If the chrome is too see-through/too solid, adjust `--kbfe-glass-surface` mix % (lower = more see-through). Re-run `npm run build`.

- [ ] **Step 3: Commit any tuning (skip if no changes)**

```bash
git add -A
git commit -m "style(bg): tune grid & glass intensity across theme matrix"
```

---

## Self-Review

- **Spec coverage:** dot → grid (Task 1) ✓; grid visible full-viewport / fixes the "disappears when scrolled" issue by removing the mask (Task 1) ✓; grid shows through components incl. navbar/sidebar via frosted glass (Task 2) ✓; readability of dense data / menus / modals preserved by not touching the global surface token (Task 2, Global Constraints) ✓; light + dark + all themes (Task 3) ✓.
- **Placeholder scan:** none — every step shows the exact before/after CSS.
- **Type/name consistency:** `--kbfe-decorative-grid-color` and `--kbfe-decorative-grid-major` are defined in Task 1 Step 1 and consumed in Task 1 Step 2. `--kbfe-glass-surface` is defined in Task 2 Step 1, pinned in Step 2, consumed in Step 3. Old `--kbfe-decorative-dot-color` is fully removed (verified by grep in Task 1 Step 4).
