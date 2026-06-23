import type { z } from 'zod';

/**
 * Dev-only contract guard. Validates an API response against a zod schema and
 * logs a loud warning on drift, but NEVER throws and NEVER mutates the data —
 * contract drift is a developer signal, not a runtime failure. No-op in prod.
 */
export function parseContract(schema: z.ZodType, data: unknown, label: string): void {
  if (!import.meta.env.DEV) return;
  const result = schema.safeParse(data);
  if (!result.success) {
    // eslint-disable-next-line no-console
    console.warn(`[contract] ${label} does not match the expected shape`, result.error.issues);
  }
}
