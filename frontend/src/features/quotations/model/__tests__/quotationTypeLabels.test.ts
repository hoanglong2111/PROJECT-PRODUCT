import { describe, expect, it } from 'vitest';

import { quotationTypeFullLabelKeys, quotationTypeShortLabels } from '../quotationModel';

describe('quotation type labels', () => {
  it('maps every quotation type to a short badge label', () => {
    expect(quotationTypeShortLabels).toEqual({
      FREIGHT: 'FREIGHT',
      LOCAL_CHARGE: 'LOCAL',
      CUSTOMS: 'CUSTOMS',
      TRUCKING: 'TRUCK',
      MIXED: 'MIXED',
    });
  });

  it('maps every quotation type to a full i18n key', () => {
    expect(quotationTypeFullLabelKeys).toEqual({
      FREIGHT: 'quotations.type.freight',
      LOCAL_CHARGE: 'quotations.type.localCharge',
      CUSTOMS: 'quotations.type.customs',
      TRUCKING: 'quotations.type.trucking',
      MIXED: 'quotations.type.mixed',
    });
  });
});
