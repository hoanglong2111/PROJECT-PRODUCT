---
name: kbfe-uiux-debug
description: Use when diagnosing, reviewing, or fixing KBFE ERP/logistics UI/UX defects, layout regressions, visual hierarchy problems, accessibility issues, responsive overflow, theme/token bugs, or mismatches between React/Mantine UI behavior and the intended operational workflow.
---

# KBFE UI/UX Debug Skill

## Purpose

Debug KBFE screens as both a senior UI/UX designer and frontend engineer. The goal is to turn vague feedback like "looks noisy", "hard to use", "layout is off", or "does not match workflow" into a concrete diagnosis, scoped UI/FE fix, and verification result.

## Use When

- A screen looks visually noisy, text-heavy, misaligned, sparse, or hard to scan.
- A Mantine/React component behaves incorrectly across desktop, mobile, theme, density, or language.
- Layout breaks with long PO/DO/quotation/shipment/task codes, Vietnamese labels, badges, buttons, tables, tabs, drawers, or forms.
- Search/filter/table/detail UX does not support the operational task quickly enough.
- A theme, design token, status color, loading/empty/error state, or accessibility behavior regresses.
- The user asks for UI/UX review, polish, redesign, bugfix, or "debug UI".

## Do Not Use When

- The task is pure backend/API/data-model work with no UI impact.
- The user wants brand exploration, marketing landing pages, or illustration-heavy creative direction.
- A domain rule is unclear and must be resolved in backend/data-model docs first.
- The request is only to create new business functionality; use the frontend/backend skills first, then this skill for UX validation.

## Inputs

Gather only what is needed:

- Screen or route, for example `/settings`, `/profile`, `/delivery-orders`, `/workflow`.
- User role and permission context when relevant.
- Reported symptom, screenshot, viewport, language, theme, density, and reproduction steps.
- Expected workflow outcome: scan risk, create entity, inspect detail, update data, search, filter, close task.

## Load Focused References

- Always start with `docs/context/PROJECT_CONTEXT.md` for route/entity context.
- Read `docs/skills/ui-ux/SKILL.md` for KBFE product feel and component expectations.
- For implementation changes, read `docs/skills/frontend/SKILL.md`.
- For page-specific issues, read the matching feature page under `frontend/src/features/<feature>/page.tsx` and shared components under `frontend/src/shared/components/`.
- For design foundations, refer to the status/risk color table and component choices in `docs/skills/ui-ux/SKILL.md`.

## Debug Workflow

1. Reproduce the problem from the route and role context. If no screenshot is provided, inspect the code and infer the likely UI state before editing.
2. Name the user job: what entity, status, owner, deadline, risk, or next action should be visible in one scan?
3. Locate the owning files with `rg`: feature page, shared component, CSS/theme tokens, i18n messages, and state/API hooks.
4. Diagnose by category:
   - information hierarchy: important entity/action hidden or drowned in text
   - density: too much whitespace or too many card-like surfaces for ERP work
   - alignment: uneven controls, unstable rows, nested cards, overflowing badges/buttons
   - copy/i18n: labels too long, unclear, untranslated, or not operational
   - states: missing loading, empty, error, disabled, active, selected, hover, focus
   - accessibility: icon-only controls lack tooltip/aria-label, color-only status, weak contrast
   - responsive: mobile/tablet overflow, table scroll, long codes/names, header crowding
   - theme: Light/Dark/Auto, visual theme, density, CSS variables, Mantine defaults
   - workflow: deep links, filters, role visibility, next action, risk reason
5. Choose the smallest fix that restores scanability and behavior. Prefer existing Mantine components, shared helpers, tokens, and local patterns.
6. Implement conservatively. Do not introduce new UI libraries, broad abstractions, or unrelated redesigns.
7. Verify with `pnpm --dir frontend typecheck` and `pnpm --dir frontend build`. For visual or responsive changes, run the dev server when allowed and inspect key viewports/theme modes.

## UI/UX Fix Rules

- Keep operational pages compact, dense, and scannable.
- Use tables, filters, metrics, drawers, tabs, badges, alerts, progress, and timelines before decorative cards.
- Do not nest cards inside cards.
- Pair status colors with explicit text like `Missing B/L`, `ETA passed`, `Blocked`, or `Cost pending`.
- Preserve route query params and entity deep links.
- Keep admin-only and role-gated UI hidden when the role cannot use it.
- Use `ActionIcon` only with tooltip and `aria-label`.
- Ensure text fits in Vietnamese and English without overlapping buttons, badges, tabs, or table cells.
- Respect current design tokens and theme attributes; do not hard-code new palettes unless adding a deliberate token.

## Output

For review-only work:

- Lead with findings ordered by severity.
- Include file/line references when possible.
- Explain the workflow risk, not only the visual symptom.
- Mention residual test or visual-check gaps.

For implementation work:

- State what changed and why.
- List touched files briefly.
- Report verification commands and results.
- Mention any manual smoke checks that were not possible.

## Tools

- Prefer `rg` / `rg --files` for search.
- Use existing React, Mantine, Tabler Icons, TanStack Query, Zustand, and CSS variable architecture.
- Use `apply_patch` for manual edits when available; otherwise edit scoped project files carefully.
- Run `pnpm --dir frontend typecheck` and `pnpm --dir frontend build` before final response.

## Safety

- Do not invent ERP business rules, API contracts, role permissions, or hidden data requirements.
- Do not remove user changes or unrelated work in a dirty tree.
- Do not trade accessibility for visual polish.
- Do not make a marketing/landing-page treatment for ERP work surfaces.
- Ask only when the missing detail makes the fix unsafe, such as unknown role visibility or destructive UX behavior.

## Quality Bar

- The main entity and next action are visible within one scan.
- Risk and blocked states explain exactly why they exist.
- Layout survives long codes, Vietnamese labels, mobile width, dark mode, and compact density.
- Empty/loading/error/disabled/focus states exist where the workflow needs them.
- The fix is scoped, buildable, and consistent with KBFE UI/UX and frontend skills.
