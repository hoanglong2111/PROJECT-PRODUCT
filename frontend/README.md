# KBFE Frontend

Standalone React/Vite package. The Feature-Sliced Design source tree lives under `src/` and does not depend on the backend package.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Verification and production build:

```bash
pnpm verify
pnpm build
```

Set `VITE_API_URL` to the backend API base URL. See `.env.example`.
