# GD1 Product AI Harness MVP

This module is the current read-only product/runtime harness for KBFE GD1 operational copilots.

This is not the IDE/development harness used to coordinate Codex, Claude, Cursor, Gemini, or other coding agents while building the project. For that scope, use `docs/modules/platform/dev-ai-harness.md` and `.agents/harness/`.

## Purpose

The product harness coordinates compact GD1 operational context, deterministic model routing, cache, metrics, prompt templates, and GD1-specific agents for:

- PR and PO follow-up suggestions.
- SLA, shipment, task, and ERP sync risk detection.
- PO-stage task draft generation.

The current implementation is dry-run. It always runs deterministic agents first, and can optionally call an external OpenAI-compatible model to enrich recommendations without writing operational data.

## Boundary

| Harness | Serves | Current location |
|---|---|---|
| Product AI Harness | Users operating KBFE screens such as PO and Shipment triage | `server/ai`, `server/modules/ai`, `src/shared/components/Gd1HarnessPanel.tsx` |
| Development AI Harness | AI agents in IDE/build workflows that help develop this repository | `.agents/harness`, `AGENTS.md`, `docs/skills`, `server/mcp/deployServer.ts` |

Do not use this product harness as the source of truth for development-agent behavior. It may expose useful read-only GD1 context to development agents, but it is not the coordinator for repository edits.

## Runtime Code

| Layer | Location |
|---|---|
| Orchestrator | `server/ai/harness/orchestrator.ts` |
| Model routing | `server/ai/harness/modelRouter.ts` |
| Context compression | `server/ai/harness/contextPacker.ts` |
| Cache | `server/ai/harness/cache.ts` |
| Metrics | `server/ai/harness/metrics.ts` |
| External model adapter | `server/ai/llm/modelAdapter.ts` |
| Prompt templates | `server/ai/prompts/registry.ts` |
| PR suggestion agent | `server/ai/agents/prSuggestionAgent.ts` |
| SLA detection agent | `server/ai/agents/slaDetectionAgent.ts` |
| Task generation agent | `server/ai/agents/taskGenerationAgent.ts` |
| REST route | `server/modules/ai/routes.ts` |
| MCP entrypoint | `server/mcp/deployServer.ts` |

## REST API

```text
POST /api/ai/harness
GET /api/ai/harness/metrics
DELETE /api/ai/harness/cache
```

Example body:

```json
{
  "intent": "triage_gd1",
  "entityType": "purchase_order",
  "entityRef": "PO-2026-000145",
  "llmMode": "auto",
  "maxRows": 25
}
```

`llmMode` values:

- `auto`: use the external model only when env configuration is present and model routing says it is useful.
- `off`: deterministic rules only.
- `force`: call the external model even when the route selected the `rules` tier.

## MCP

Resources:

- `kbfe://ai/harness/metrics`
- `kbfe://ai/harness/risk-triage`

Tools:

- `run_gd1_harness`
- `get_harness_metrics`
- `clear_harness_cache`

## Frontend Touchpoints

The dry-run harness is surfaced in the app through `src/shared/components/Gd1HarnessPanel.tsx`:

- `src/features/purchase-orders/page.tsx`: PO detail drawer uses `entityType=purchase_order`.
- `src/features/delivery-orders/page.tsx`: Shipment OPS tab uses `entityType=delivery_order`.

The panel displays action recommendations, SLA risks, task drafts, cache state, model route, and LLM status. It does not create tasks, update milestones, approve PR/PO, or sync ERP.

## Token-Saving Mechanisms

| Mechanism | Current implementation |
|---|---|
| Model routing | Routes to `rules`, `small`, or `large` tiers based on intent, agent count, entity count, and context token estimate. |
| Context compression | Packs only related PR, PR lines, PO, PO lines, shipment, milestones, tasks, and templates. |
| Caching | Short TTL in-memory cache keyed by normalized harness input. |
| Prompt template | Standard prompt registry per agent, included only when requested. |

## External Model Adapter

Set these env vars to enable the OpenAI-compatible Chat Completions adapter:

```text
AI_PROVIDER=openai_compatible
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=<provider-api-key>
AI_SMALL_MODEL=<small-model-name>
AI_LARGE_MODEL=<large-model-name>
AI_TIMEOUT_MS=20000
AI_TEMPERATURE=0.1
```

`OPENAI_API_KEY` is accepted as a fallback for `AI_API_KEY`. `AI_MODEL` can be used as a fallback for both small and large model names.

The adapter sends one compact request per harness run, asks for JSON only, validates the returned JSON, drops unknown fields, forces `dryRun=true`, and merges LLM output into deterministic results.

## Safety

- Outputs are dry-run recommendations, risks, or task drafts.
- If the model call fails, the harness returns deterministic results and records the failure in `llm`.
- Write actions must remain in backend routes with auth, idempotency, audit, and state validation.
- Runtime still maps GD1 Shipment to legacy `delivery_orders` until the schema migration is complete.
