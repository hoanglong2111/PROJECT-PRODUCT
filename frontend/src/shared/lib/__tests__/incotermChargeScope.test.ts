import { describe, expect, it } from 'vitest';

import { defaultScopeForIncoterm } from '../incotermChargeScope';

const REAL_GROUPS = new Set([
  'ORIGIN_EXPORT',
  'MAIN_FREIGHT',
  'FREIGHT_SURCHARGE',
  'DOCUMENTATION_FILING',
  'DESTINATION_IMPORT',
  'ANCILLARY_ACCESSORIAL',
  'SERVICE_OTHER',
]);

describe('defaultScopeForIncoterm', () => {
  it('covers all 6 real incoterms with only real groups', () => {
    for (const code of ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'DDP']) {
      const scope = defaultScopeForIncoterm(code);
      expect(Array.isArray(scope.groups)).toBe(true);
      scope.groups.forEach((g) => expect(REAL_GROUPS.has(g)).toBe(true));
    }
  });

  it('gives EXW the full 5-group buyer chain', () => {
    expect(defaultScopeForIncoterm('exw').groups).toEqual([
      'ORIGIN_EXPORT',
      'MAIN_FREIGHT',
      'FREIGHT_SURCHARGE',
      'DOCUMENTATION_FILING',
      'DESTINATION_IMPORT',
    ]);
  });

  it('marks CIF insurance as seller-arranged info flag', () => {
    expect(defaultScopeForIncoterm('CIF').insuranceRequired).toBe(true);
    expect(defaultScopeForIncoterm('FOB').insuranceRequired).toBe(false);
  });

  it('gives DDP an empty buyer scope', () => {
    expect(defaultScopeForIncoterm('DDP').groups).toEqual([]);
  });

  it('falls back to the 5 primary groups for unknown codes', () => {
    expect(defaultScopeForIncoterm('ZZZ').groups).toEqual([
      'ORIGIN_EXPORT',
      'MAIN_FREIGHT',
      'FREIGHT_SURCHARGE',
      'DOCUMENTATION_FILING',
      'DESTINATION_IMPORT',
    ]);
    expect(defaultScopeForIncoterm(null).insuranceRequired).toBe(false);
  });

  it('returns a fresh array (not a shared mutable reference)', () => {
    const a = defaultScopeForIncoterm('EXW').groups;
    a.push('MUTATED');
    expect(defaultScopeForIncoterm('EXW').groups).not.toContain('MUTATED');
  });
});
