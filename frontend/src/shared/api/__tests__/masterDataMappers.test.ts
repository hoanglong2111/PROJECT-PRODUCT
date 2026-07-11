import { describe, expect, it } from 'vitest';

import { normalizeChargeCode } from '../chargeCodes';
import { normalizeCarrier, normalizeForwarder } from '../forwarders';
import { normalizeItem } from '../items';
import { normalizeTaskTemplate } from '../taskTemplates';
import { normalizeIncoterm, normalizeSupplier } from '../tradeMasterData';

describe('master data mappers', () => {
  it('normalizes item fields with sensible defaults', () => {
    const item = normalizeItem({
      id: 'item_001',
      item_code: 'ITM-001',
      item_name: 'Test Item',
      customs_profiles: [{ id: 'icp_1', item_id: 'item_001', hs_code: '84089090' }],
    });

    expect(item.item_name_en).toBe('Test Item');
    expect(item.hs_code).toBe('84089090');
    expect(item.is_active).toBe(true);
    expect(item.uom_conversion).toBe(1);
    expect(item.customs_profiles).toHaveLength(1);
  });

  it('normalizes supplier canonical fields from legacy names without deriving current roles', () => {
    const supplier = normalizeSupplier({
      id: 'sup_legacy',
      supplier_code: 'SUP-001',
      supplier_name: 'Supplier',
      supplier_type: 'OVERSEAS_SEA',
      supplier_roles: ['SUPPLIER'],
      country: 'CN',
      address: null,
      contact_name: 'Li Wei',
      contact_email: null,
      contact_phone: null,
      payment_term: null,
      default_currency_code: null,
      default_incoterm_code: null,
      default_currency_id: null,
      default_incoterm_id: null,
      lead_time_days: 25,
      is_active: true,
    });

    expect(supplier.supplier_type).toBe('OVERSEAS_SEA');
    expect(supplier.supplier_roles).toEqual(['SUPPLIER']);
    expect(supplier.contact_person).toBe('Li Wei');
    expect(supplier.contact_name).toBe('Li Wei');
    expect(supplier.lead_time_production_days).toBe(25);
    expect(supplier.lead_time_days).toBe(25);
  });

  it('normalizes charge-code group separately from row category', () => {
    const chargeCode = normalizeChargeCode({
      id: 'chg_pre',
      charge_code: 'PRE',
      charge_name_en: 'Pre-carriage',
      charge_name_vn: '',
      category: 'ORIGIN_EXPORT',
      default_uom: 'CNTR',
      sea_fcl: true,
      sea_lcl: false,
      air: false,
      road: false,
      rail: true,
      rev_cost: 'BOTH',
      taxable: true,
      description: null,
      is_active: true,
    } as Parameters<typeof normalizeChargeCode>[0]);

    expect(chargeCode.group).toBe('ORIGIN_EXPORT');
    expect(chargeCode.category).toBe('SERVICE');
  });

  it('keeps forwarder, carrier, and task template nullable fields stable', () => {
    expect(normalizeForwarder({
      id: 'fwd_001',
      forwarder_code: 'FWD-001',
      forwarder_name: 'FDS',
      forwarder_type: 'MULTI',
      country: 'VN',
      contact_person: 'Ops',
      contact_email: null,
      contact_phone: null,
      is_primary: true,
      note: null,
    })).toMatchObject({ contact_email: null, contact_phone: null, is_primary: true, note: null });

    expect(normalizeCarrier({
      id: 'carr_001',
      carrier_code: 'COSCO',
      carrier_name: 'COSCO Shipping Lines',
      carrier_type: 'SHIPPING_LINE',
      scac_iata_code: 'COSU',
      service_route_note: null,
      contact_booking: null,
      contact_email: null,
      note: null,
    })).toMatchObject({ service_route_note: null, contact_booking: null, contact_email: null, note: null });

    expect(normalizeTaskTemplate({
      id: 'tt_001',
      group_code: 'GR1',
      group_name: 'Báo giá',
      task_name: 'Task',
      task_description: 'Description',
      milestone_code: null,
      sla_hours: null,
      sla_text: null,
      department: 'FDS_SALES',
      assignee_code: null,
      related_documents: 'Quotation email',
      is_required_for_closure: false,
      note: null,
      sort_order: 3,
    })).toMatchObject({
      milestone_code: null,
      sla_hours: null,
      sla_text: null,
      assignee_code: null,
      related_documents: 'Quotation email',
      note: null,
      sort_order: 3,
    });
  });
});

describe('normalizeIncoterm scope defaults', () => {
  const base = {
    id: '1',
    incoterm_code: 'CIF',
    incoterm_name: 'CIF',
    incoterm_name_vn: '',
    description: null,
    is_active: true,
  };

  it('fills scope from the Incoterms 2020 seed when backend omits it', () => {
    const result = normalizeIncoterm(base);
    expect(result.charge_group_scope).toEqual(['DOCUMENTATION_FILING', 'DESTINATION_IMPORT']);
    expect(result.insurance_required).toBe(true);
  });

  it('keeps backend-provided scope untouched (swap-friendly)', () => {
    const result = normalizeIncoterm({
      ...base,
      charge_group_scope: ['MAIN_FREIGHT'],
      insurance_required: false,
    });
    expect(result.charge_group_scope).toEqual(['MAIN_FREIGHT']);
    expect(result.insurance_required).toBe(false);
  });
});
