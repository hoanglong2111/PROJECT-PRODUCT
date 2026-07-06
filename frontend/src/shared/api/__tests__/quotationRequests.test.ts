import { describe, expect, it } from 'vitest';

import { buildRfqRouteLabel } from '../quotationRequests';

describe('buildRfqRouteLabel', () => {
  it('joins origin and destination with an arrow', () => {
    expect(buildRfqRouteLabel({ origin_port: 'CNSHA', destination_port: 'VNHPH' })).toBe('CNSHA → VNHPH');
  });

  it('falls back to a dash when a port is missing', () => {
    expect(buildRfqRouteLabel({ origin_port: null, destination_port: 'VNHPH' })).toBe('— → VNHPH');
  });
});
