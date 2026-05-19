# Deployment Flow, MCP, and DB Plan

## Current Runtime Shape

The app now uses normalized PostgreSQL tables as the runtime database shape. `logistics_snapshots` is no longer created or seeded by the backend boot path.

Core tables:

- `purchase_requests`
- `purchase_request_lines`
- `purchase_orders`
- `purchase_order_lines`
- `delivery_orders`
- `delivery_order_source_lines`
- `efms_transport_records`
- `efms_containers`
- `logistics_tasks`
- `logistics_attachments`
- `finance_charge_lines`
- `finance_notes`
- `audit_logs`

`server/services/logistics.ts` still exposes helper names `readSnapshot` and `writeSnapshot` internally to avoid a broad service rewrite, but those helpers now call `server/services/normalizedStore.ts` and read/write normalized tables.

## Seed Strategy

Seed normalized logistics data:

```bash
pnpm seed:logistics
```

Rebuild only normalized seed tables from scratch:

```bash
RESET_NORMALIZED_SEED=1 pnpm seed:logistics
```

The seed creates the normalized schema from `server/migrations/001_normalized_logistics_schema.sql` and imports fixtures from `server/seeds/logisticsSeed.ts`.

## Deploy Topology

```text
Browser
  |
  | HTTPS
  v
FE Static Host / CDN
  |
  | VITE_API_URL=https://api.<domain>/api
  v
BE Node Service
  |
  | DATABASE_URL
  v
Managed PostgreSQL

MCP Server
  |
  | read-only checks first: health/schema/counts/risk
  v
BE Node Service + Managed PostgreSQL
```

## FE Goes Where

Deploy FE to a static web host/CDN:

- Vercel
- Netlify
- Cloudflare Pages
- S3 + CloudFront
- Nginx static site

Build command:

```bash
pnpm build
```

Publish directory:

```text
dist/
```

Required FE env:

```text
VITE_API_URL=https://api.<your-domain>/api
```

## BE Goes Where

Deploy BE to a Node runtime service:

- Render Web Service
- Railway Service
- Fly.io Machine
- VPS/systemd + Nginx reverse proxy
- Docker container on any platform

Start command:

```bash
pnpm start:be
```

Required BE env:

```text
PORT=10000
CORS_ORIGIN=https://app.<your-domain>
DATABASE_URL=postgresql://...
DATABASE_SSL=true
JWT_SECRET=<strong-secret>
```

`BE_PORT` is still supported for local development, but hosted Node platforms such as Render usually provide `PORT`.
Use origins without a trailing slash. Multiple FE domains can be comma-separated, for example `https://app.example.com,https://preview.example.com`.

Health check:

```text
GET /api/health
```

## DB Goes Where

Deploy DB to managed PostgreSQL:

- Supabase Postgres
- Neon
- Railway Postgres
- Render Postgres
- AWS RDS PostgreSQL
- Cloud SQL PostgreSQL

Bootstrap DB:

```bash
pnpm seed:logistics
```

For production, seed should be replaced by migrations plus real import/onboarding data. The normalized migration is already in `server/migrations/001_normalized_logistics_schema.sql`.

## MCP Server Goes Where

MCP should be deployed as a small separate Node service when agents need deploy/runtime inspection. It should not replace the backend.

MCP can support build and deploy flows, but it should be treated as an automation/control layer, not as the hosting platform itself. The actual deployment still runs through a platform API, CLI, GitHub Actions workflow, or a VPS/Docker command.

Recommended connection model:

```text
Codex / Agent
  |
  | MCP tools/resources
  v
Deploy MCP Server
  |
  | provider API / CLI / CI trigger
  v
Vercel / Netlify / Render / Railway / Fly.io / Supabase / Neon / VPS
```

In other words, MCP answers questions like:

- Is FE build ready?
- Is BE health check passing?
- Is `DATABASE_URL` configured?
- Did migration/seed run?
- Which deploy target should be triggered?
- What failed in the latest deploy log?

And MCP can expose tools that trigger deploy actions when explicitly allowed.

Recommended MCP deploy tools:

- `check_repo_readiness`: run typecheck/build/test checks.
- `check_env_readiness`: verify required env names exist without leaking secrets.
- `inspect_db_schema`: compare live DB schema with migration expectations.
- `run_db_migration`: run allowlisted migration commands.
- `deploy_frontend`: trigger FE deploy on Vercel/Netlify/Cloudflare Pages/S3.
- `deploy_backend`: trigger BE deploy on Render/Railway/Fly.io/VPS/Docker.
- `check_runtime_health`: call `/api/health` and optionally smoke-test login/data routes.
- `read_deploy_logs`: fetch the latest deploy logs from the selected provider.

Write/deploy MCP tools should require explicit confirmation, audit logs, and idempotent commands. Read-only MCP resources can be enabled first.

Recommended first MCP capabilities:

- Check FE/BE/DB env readiness.
- Check `/api/health`.
- Inspect DB schema and table counts.
- Read workflow/risk context through backend APIs.
- Run read-only SQL allowlisted for deploy diagnostics.

Recommended first MCP resources:

- `kbfe://deploy/readiness`
- `kbfe://deploy/env`
- `kbfe://deploy/db-schema`
- `kbfe://deploy/db-counts`
- `kbfe://deploy/health`
- `kbfe://risk-queue`

Write MCP tools should wait until backend audit and idempotency are complete.

## MCP Provider Mapping

Practical deploy mapping:

| Layer | Preferred deploy target | MCP connection style |
| --- | --- | --- |
| FE | Vercel / Netlify / Cloudflare Pages | Trigger platform deploy API or GitHub Actions |
| BE | Render / Railway / Fly.io / VPS Docker | Trigger platform deploy API, CLI, webhook, or SSH command |
| DB | Supabase / Neon / Railway / Render Postgres | Run migration via backend job, CI, or restricted SQL tool |
| MCP | Render / Railway / Fly.io / VPS Docker | Separate Node service with provider tokens stored as env vars |

Minimum secrets for a deploy-capable MCP server:

```text
DATABASE_URL=postgresql://...
APP_BASE_URL=https://app.<your-domain>
API_BASE_URL=https://api.<your-domain>/api
DEPLOY_PROVIDER=<vercel|netlify|render|railway|fly|vps>
DEPLOY_TOKEN=<provider-token>
GITHUB_TOKEN=<optional-if-triggering-ci>
FE_DEPLOY_WEBHOOK_URL=<optional-provider-or-ci-webhook>
BE_DEPLOY_WEBHOOK_URL=<optional-provider-or-ci-webhook>
DEPLOY_WEBHOOK_TOKEN=<optional-webhook-token>
```

For this project, the safest first version is:

1. MCP read-only checks: repo readiness, DB schema/counts, `/api/health`.
2. MCP deploy trigger through GitHub Actions or provider webhook.
3. MCP log reader for failed deploys.
4. MCP migration tool after audit logging is added.

## Implemented MCP Entry Point

This repo includes a first deploy MCP server:

```bash
pnpm mcp:deploy
```

Implemented resources:

- `kbfe://deploy/readiness`
- `kbfe://deploy/env`
- `kbfe://deploy/db-schema`
- `kbfe://deploy/db-counts`
- `kbfe://deploy/health`
- `kbfe://risk-queue`

Implemented tools:

- `check_env_readiness`
- `inspect_db_schema`
- `inspect_db_counts`
- `check_runtime_health`
- `check_repo_readiness`
- `run_db_migration`
- `deploy_frontend`
- `deploy_backend`

Deploy triggers are webhook-based. Set these only when the target platform or CI workflow is ready:

```text
FE_DEPLOY_WEBHOOK_URL=<provider-or-ci-webhook>
BE_DEPLOY_WEBHOOK_URL=<provider-or-ci-webhook>
DEPLOY_WEBHOOK_TOKEN=<optional-webhook-token>
```

`run_db_migration`, `deploy_frontend`, and `deploy_backend` are guarded. They return a dry-run response unless the MCP caller passes `confirm=true`.

## Deploy Order

1. Create managed PostgreSQL.
2. Set `DATABASE_URL`.
3. Run `pnpm seed:logistics` or migration/import job.
4. Deploy BE with `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`.
5. Verify `/api/health`.
6. Deploy FE with `VITE_API_URL`.
7. Verify login and PR/PO/DO/Tasks routes.
8. Add MCP server for readiness checks and operational inspection.
