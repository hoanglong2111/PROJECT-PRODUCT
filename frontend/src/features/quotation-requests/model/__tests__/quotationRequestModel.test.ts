import { describe, expect, it } from 'vitest';

import { quotationRequestStatusTabs } from '../quotationRequestModel';

describe('quotationRequestStatusTabs', () => {
  it('maps the quoted tab to the QUOTED status', () => {
    expect(quotationRequestStatusTabs.quoted).toEqual(['QUOTED']);
  });
});
