import { describe, expect, it } from 'vitest';

import { documentStatusColor } from '../DocumentStatusBadge';

describe('documentStatusColor', () => {
  it('maps approved/verified to green', () => {
    expect(documentStatusColor('APPROVED')).toBe('green');
    expect(documentStatusColor('VERIFIED')).toBe('green');
  });

  it('maps in-review states to orange and rejected to red', () => {
    expect(documentStatusColor('RECEIVED')).toBe('orange');
    expect(documentStatusColor('WAITING_REVIEW')).toBe('orange');
    expect(documentStatusColor('REJECTED')).toBe('red');
  });

  it('falls back to gray for unknown or neutral states', () => {
    expect(documentStatusColor('DRAFT')).toBe('gray');
    expect(documentStatusColor('SOMETHING_ELSE')).toBe('gray');
  });
});
