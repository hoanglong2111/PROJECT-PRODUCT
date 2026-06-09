export type PartnerRecord = {
  id: string;
  code: string;
  name: string;
  type: 'SUPPLIER' | 'CARRIER' | 'FORWARDER';
  tax_code: string;
  address: string;
  contact_email: string;
};

export type PortRecord = {
  id: string;
  port_code: string;
  port_name: string;
  country: string;
  type: 'SEA' | 'AIR' | 'BORDER';
};

export type ItemRecord = {
  id: string;
  item_code: string;
  item_group: string;
  source_reference: string;
  declaration_type: string;
  item_name: string;
  hs_code: string;
  duty_rate: number;
  vat_rate: number;
  tariff_code: string;
  classification_code: string;
  co_note: string;
  tax_note: string;
};
