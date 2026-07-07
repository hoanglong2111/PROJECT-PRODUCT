import { describe, expect, it } from 'vitest';

import { uomSelectOptions, type Uom } from '../uoms';

const makeUom = (over: Partial<Uom>): Uom => ({
  id: 'u1',
  uom_code: 'PCE',
  uom_name_en: 'Piece',
  uom_name_vn: 'Cai',
  description: null,
  is_active: true,
  ...over,
});

describe('uomSelectOptions', () => {
  it('maps each uom to a code value and "code - name" label', () => {
    const options = uomSelectOptions([
      makeUom({ uom_code: 'CTN', uom_name_en: 'Carton' }),
      makeUom({ uom_code: 'KGM', uom_name_en: 'Kilogram' }),
    ]);

    expect(options).toEqual([
      { value: 'CTN', label: 'CTN - Carton' },
      { value: 'KGM', label: 'KGM - Kilogram' },
    ]);
  });

  it('returns an empty array for an empty list', () => {
    expect(uomSelectOptions([])).toEqual([]);
  });
});
