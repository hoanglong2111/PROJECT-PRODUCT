# KBFE Frontend

Standalone React/Vite package. The Feature-Sliced Design source tree lives under `src/` and does not depend on the backend package.

```bash
npm ci
npm run dev
```

Verification and production build:

```bash
npm run verify
npm run build
```

Set `VITE_API_URL` to the backend API base URL. See `.env.example`.
