# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read AGENTS.md first

**[AGENTS.md](./AGENTS.md) is the single source of truth for working in this `frontend/` package** — architecture, project structure, path aliases, state management, dependency boundaries, coding style, testing, and business rules. It is the shared, cross-agent guide (Claude Code, Codex, and others), so guidance lives there once instead of being duplicated and drifting out of sync.

Before doing any work here, read [AGENTS.md](./AGENTS.md) and follow it. Everything that used to be in this file now lives there.

## Commands (quick reference)

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

Use npm only (no pnpm/yarn). Node >=20.19.0. Set `VITE_API_URL` for the backend base URL (see `.env.example`). The frontend is backend-agnostic and consumes the backend only through the API contract in [docs/API_CONTRACT.md](./docs/API_CONTRACT.md) (a mock backend implements it today). For everything else, see [AGENTS.md](./AGENTS.md).

## Skills

Project skills live as real, committed folders in `.claude/skills/<name>/` and are
discovered natively by Claude Code — no junctions, no setup step, nothing to run after a
clone. Each skill is a `SKILL.md` (plus an optional `references/` folder for long material):

- `frontend-api-client` — wire typed API integrations against `docs/API_CONTRACT.md`.
- `skill-builder` — author new `SKILL.md` files (worked example in its `references/`).
- `gpt-taste`, `redesign-existing-projects` — design/UX helpers.

Edit a skill directly at `.claude/skills/<name>/SKILL.md`. Its frontmatter `name` must
match the folder name.
