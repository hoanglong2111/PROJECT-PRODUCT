---
name: frontend-api-client
description: >
  Builds typed frontend API integrations for the KBI frontend. Use whenever the
  user asks to call the mock API from React, wire Axios requests, replace
  localStorage/mock services with real endpoints, or manage API-driven state.
  Trigger on: "frontend call API", "wire API", "use axios", "connect mock API",
  "replace mock data", or requests to add query/mutation flows in frontend.
---

# Frontend API Client

Creates a typed, testable API layer for `PROJECT-PRODUCT/frontend` using Axios,
React Query, and Zustand only when client-side state is needed.

## When to Use

- The frontend needs to call KBI mock API endpoints from `kbi-mock-api/docs/api_doc.md`.
- A feature currently reads mock/localStorage data and must switch to server data.
- A page needs list/detail/create/update/delete flows with loading and error states.
- Shared API contracts, query keys, or API error handling need to be standardized.

## Inputs

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| feature_scope | YES | string | Feature or endpoints to integrate, such as `items` or `item-groups` |
| api_doc_path | optional | string | Defaults to `kbi-mock-api/docs/api_doc.md` |
| frontend_root | optional | string | Defaults to `PROJECT-PRODUCT/frontend` |
| state_needs | optional | string | Client state that cannot live in React Query cache |
| ui_entry_points | optional | string[] | Pages/components that will consume the API |

## Outputs

- Typed API modules under `src/shared/api`.
- Stable query keys in `src/shared/api/queryKeys.ts`.
- React Query hooks or page-level `useQuery`/`useMutation` usage.
- Optional Zustand store under `src/shared/stores` for UI/client state only.
- Focused tests for query keys, response transforms, or state selectors.
- Verification notes with commands run.

## Workflow

1. Read API documentation - identify base URL, path prefix, request bodies, pagination, response shapes, and error messages for the requested scope.
2. Inspect frontend conventions - read `frontend/AGENTS.md`, `package.json`, existing `src/shared/api/*`, stores, and relevant feature pages.
3. Define types - create request, response, entity, pagination, and error types using API field names unless a local mapper is required.
4. Create Axios client - add or reuse a shared client configured from `import.meta.env.VITE_API_URL`, defaulting to the local mock API when appropriate, and set `/api` as the prefix once.
5. Implement endpoint functions - export named async functions for list, detail, create, update, and delete actions; unwrap `{ data }` responses consistently.
6. Add query keys - create parameterized keys for paginated/search/filter queries and id-based detail queries.
7. Wire data fetching - use React Query for server state, including loading, error, empty, pagination, search, mutation invalidation, and optimistic behavior only when low risk.
8. Add Zustand only if needed - store filters, selected ids, draft UI state, or cross-page preferences; do not duplicate server records already cached by React Query.
9. Handle errors - normalize Axios errors to user-readable messages and preserve backend `message` values.
10. Validate - run `npm run typecheck`; run focused tests or add small tests when query keys, mappers, or stores are changed.

## Rules

- Keep shared API code inside `src/shared/api`; keep feature-specific UI logic inside `src/features/<feature>`.
- Use aliases such as `@shared/api/...`; avoid deep relative imports.
- Do not import backend/server code into frontend.
- Do not commit `.env`; document `VITE_API_URL` when configuration changes.
- Keep decimal fields from the API as `string | number` at boundaries if the backend may serialize Prisma decimals as strings.
- Use React Query for server state by default; use Zustand only for client state that should outlive a component or span pages.
- Keep CRUD functions named explicitly, such as `fetchItems`, `createItem`, `updateItem`, and `deleteItem`.
- Preserve existing frontend style: TypeScript, two-space indentation, single quotes, semicolons, named exports.

## Validation Checklist

| Check | Pass Criteria |
|-------|---------------|
| API base URL | Uses `VITE_API_URL` with one `/api` prefix strategy |
| Types complete | Entities, payloads, pagination, and response wrappers are typed |
| Query keys stable | Keys include pagination/search/filter params where relevant |
| Errors surfaced | Backend `message` appears in UI or normalized helper output |
| State ownership clear | React Query owns server data; Zustand owns only client state |
| Boundaries respected | No frontend import from backend/server packages |
| Verification run | `npm run typecheck` or a narrower justified check is reported |

## Error Handling

| Situation | Action |
|-----------|--------|
| API docs omit a field | Type the field as optional and add a short comment only if ambiguity affects usage |
| Base URL missing | Default Axios to `http://localhost:3001/api` and document `VITE_API_URL` override |
| Endpoint returns unexpected shape | Add a narrow response guard or mapper and cover it with a focused test |
| Mutation fails | Show backend `message`, keep current cache, and avoid destructive UI updates |
| Scope is too broad | Implement one coherent resource first, then repeat the same pattern |

## Example

**User request:** "Connect master data items to the mock API with axios and Zustand if needed."

**Expected agent output:**

- Add `src/shared/api/kbiClient.ts` with a shared Axios instance using `VITE_API_URL`
  or `http://localhost:3001/api`.
- Add `src/shared/api/items.ts` with `Item`, `ListItemsParams`,
  `PaginatedResponse<Item>`, `fetchItems`, `fetchItem`, `createItem`, `updateItem`,
  `deleteItem`, and tax-profile functions if the feature needs customs data.
- Extend `src/shared/api/queryKeys.ts` with `items(params)`, `itemDetail(id)`,
  and `itemTaxProfiles(itemId)` keys.
- Update the consuming page to call `useQuery` for lists/details and `useMutation`
  for create/update/delete, invalidating the matching item keys after success.
- Add a Zustand store only for selected item ids and remembered list filters; leave
  API records in React Query.
- Run `npm run typecheck` and report any follow-up test gaps.
