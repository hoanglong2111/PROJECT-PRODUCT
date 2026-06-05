import { randomUUID } from 'crypto';
import { GD1_PREFIXES } from './gd1Constants';

/**
 * Generates a standardized entity ID with a specific prefix.
 * Format: [PREFIX]-[UUID_V4] or custom logic like [PREFIX]-[YYMMDD]-[SEQ]
 * Since we don't have direct DB sequence access here, we'll use a time-based or UUID approach,
 * or standardizing the prefix.
 */
export function generateEntityId(prefix: string, sequence?: number): string {
  if (sequence !== undefined) {
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', ''); // YYYYMM
    const seqStr = sequence.toString().padStart(4, '0');
    return `${prefix}-${dateStr}-${seqStr}`;
  }
  
  // Fallback to UUID-based format
  return `${prefix}-${randomUUID()}`;
}

export function extractPrefix(entityId: string): string | null {
  const parts = entityId.split('-');
  if (parts.length > 1) {
    return parts[0];
  }
  return null;
}
