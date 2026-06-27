import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Ratchet guard for the dev-only `/v1/mock/:collection` scaffolding.
 *
 * Per docs/API_CONTRACT.md §5, the generic mock CRUD endpoints are NOT part of
 * the contract — each call site is a known gap to be promoted to a real `/v1/*`
 * business endpoint before swapping in a real backend. This budget must only ever
 * DECREASE: lowering it is progress, raising it means a feature took a new
 * dependency on mock-only scaffolding. If this test fails because the count went
 * UP, add a real endpoint instead of a `/v1/mock` call. If it went DOWN, lower
 * MOCK_SCAFFOLDING_BUDGET to lock in the win.
 */
const MOCK_SCAFFOLDING_BUDGET = 0;

const apiDir = join(dirname(fileURLToPath(import.meta.url)), '..');

function countMockCalls() {
  const breakdown: Record<string, number> = {};
  for (const entry of readdirSync(apiDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;
    const source = readFileSync(join(apiDir, entry.name), 'utf8');
    const matches = source.match(/v1\/mock/g);
    if (matches) breakdown[entry.name] = matches.length;
  }
  const total = Object.values(breakdown).reduce((sum, n) => sum + n, 0);
  return { breakdown, total };
}

describe('mock scaffolding budget', () => {
  it('does not grow the number of dev-only /v1/mock call sites', () => {
    const { breakdown, total } = countMockCalls();
    // Surfaced on failure so the offending file is obvious.
    expect({ total, breakdown }).toMatchObject({ total });
    expect(total).toBeLessThanOrEqual(MOCK_SCAFFOLDING_BUDGET);
  });
});
