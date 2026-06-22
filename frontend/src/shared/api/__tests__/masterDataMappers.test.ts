import { describe, expect, it } from 'vitest';

import { normalizeCarrier, normalizeForwarder } from '../forwarders';
import { normalizeItem } from '../items';
import { normalizeTaskTemplate } from '../taskTemplates';
import { normalizeSupplier } from '../tradeMasterData';

describe('master data mappers', () => {
  it('normalizes item canonical fields from legacy names', () => {
    const item = normalizeItem({
      id: 'item_legacy',
      item_code: 'LEG-001',
      item_name: 'Legacy Item',
      item_group_id: null,
      unit: 'PCS',
      origin_country: 'CN',
      customs_profiles: [{ id: 'icp_1', item_id: 'item_legacy', hs_code: '84089090' }],
    });

    expect(item.base_uom).toBe('PCS');
    expect(item.unit).toBe('PCS');
    expect(item.country_of_origin).toBe('CN');
    expect(item.origin_country).toBe('CN');
    expect(item.hs_code).toBe('84089090');
    expect(item.item_name_en).toBe('Legacy Item');
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
      note: null,
      sort_order: 3,
    })).toMatchObject({
      milestone_code: null,
      sla_hours: null,
      sla_text: null,
      assignee_code: null,
      note: null,
      sort_order: 3,
    });
  });
});
