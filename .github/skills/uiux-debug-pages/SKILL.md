---
name: kbfe-uiux-debug-pages
description: Use when debugging UI/UX issues where a page renders blank, disappears after navigation, redirects unexpectedly, or shows no data after profile/auth changes.
---

# KBFE UI/UX Page Debug Skill

## Goal

Find and fix page-level UX breakages fast, with focus on navigation, auth state, role guards, and data-loading failures.

## Use When

- UI shows on one page but disappears after moving to another page.
- Profile update/login works but next page is blank or partial.
- User sees unexpected redirect (`/login`, `/unauthorized`) after navigation.
- Table/list screens load with no rows because API permissions fail.

## Debug Workflow

1. Reproduce with exact route and account.
2. Check route guards:
   - `RequireAuth`
   - `RequireRole`
   - role mapping in route config and sidebar visibility.
3. Check API result codes for that route:
   - `401`: token/session issue.
   - `403`: role authorization mismatch.
   - `5xx` or network: backend/env/runtime issue.
4. Check page query behavior:
   - loading state exists
   - error state exists
   - empty state exists
5. Fix root cause:
   - align role matrix FE/BE
   - keep profile/auth payload shape stable
   - avoid state loops in profile/forms
   - keep navigation and data contracts consistent.

## KBFE-Specific Checklist

- `.env` exists and `DATABASE_URL` resolves correctly.
- Backend `/api/health` is reachable.
- `/api/auth/me` returns full user shape (`id`, `email`, `fullName`, `role`, ...).
- Dashboard/Workflow endpoints return data for authenticated roles expected to see those pages.
- Sidebar route visibility and backend auth policy do not conflict.
- After profile update, user state remains valid and route transitions still render.

## Fix Quality Gate

- Repro case no longer fails.
- No regressions on Dashboard, Workflow, PR/PO/DO/Tasks, Profile.
- Build/typecheck pass.
