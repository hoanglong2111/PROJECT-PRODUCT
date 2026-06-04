# KBFE Backend

Standalone Express/PostgreSQL package using layered MVC:

- `routes/`: endpoint declarations and middleware composition
- `controllers/`: request/response handling
- `services/`: business rules, orchestration, and transactions
- `models/`: SQL and persistence mapping
- `middlewares/`: shared HTTP middleware
- `config/`, `domain/`, `utils/`: infrastructure, backend-local contracts, and pure helpers

Local development:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Verification and production startup:

```bash
pnpm verify
pnpm build
pnpm start
```

`pnpm start` runs `dist/server.js`. Configure the service with the variables documented in `.env.example`; local `.env` files are ignored.
