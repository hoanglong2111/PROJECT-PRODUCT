import { describe, expect, it } from 'vitest';

import type { Carrier } from '@shared/api/forwarders';

import { mapCarrierOptions } from '../useTradeMasterDataOptions';

const carrier = (patch: Partial<Carrier>): Carrier => ({
  id: 'c1',
  carrier_code: 'COSCO',
  carrier_name: 'COSCO Shipping Lines',
  carrier_type: 'SHIPPING_LINE',
  scac_iata_code: null,
  service_route_note: null,
  contact_booking: null,
  contact_email: null,
  note: null,
  ...patch,
});

describe('mapCarrierOptions', () => {
  it('maps carriers to code/name options keyed by carrier_code', () => {
    expect(mapCarrierOptions([carrier({}), carrier({ id: 'c2', carrier_code: 'EMC', carrier_name: 'Evergreen' })]))
      .toEqual([
        { label: 'COSCO - COSCO Shipping Lines', value: 'COSCO' },
        { label: 'EMC - Evergreen', value: 'EMC' },
      ]);
  });
});
