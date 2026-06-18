import type { ItemRecord, PartnerRecord, PortRecord } from '@shared/model/masterData';

const PARTNERS_KEY = 'kbfe.master.partners';
const PORTS_KEY = 'kbfe.master.ports';
const ITEMS_KEY = 'kbfe.master.items';

const DEFAULT_PARTNERS: PartnerRecord[] = [
  {
    id: 'partner-sdec',
    code: 'SDEC',
    name: 'Shanghai Diesel Engine Co., Ltd.',
    type: 'SUPPLIER',
    tax_code: '91310000607330655X',
    address: 'Shanghai, China',
    contact_email: 'export@sdec.example',
  },
  {
    id: 'partner-shanghai-oem',
    code: 'SH-OEM',
    name: 'Shanghai OEM Parts Trading',
    type: 'SUPPLIER',
    tax_code: '91310000MA1FPARTS',
    address: 'Pudong, Shanghai, China',
    contact_email: 'sales@sh-oem.example',
  },
  {
    id: 'partner-fds-forwarder',
    code: 'FDS-FWD',
    name: 'FDS Global Forwarding',
    type: 'FORWARDER',
    tax_code: '0109998888',
    address: 'Hai Phong, Vietnam',
    contact_email: 'ops@fds-forwarding.example',
  },
  {
    id: 'partner-vn-trucking',
    code: 'VN-TRK',
    name: 'Vietnam Cross-Border Trucking',
    type: 'CARRIER',
    tax_code: '0208887777',
    address: 'Lang Son, Vietnam',
    contact_email: 'dispatch@vn-trucking.example',
  },
];

const DEFAULT_PORTS: PortRecord[] = [
  {
    id: 'port-cnsgh',
    port_code: 'CNSGH',
    port_name: 'Shanghai Port',
    country: 'China',
    type: 'SEA',
  },
  {
    id: 'port-vnhph',
    port_code: 'VNHPH',
    port_name: 'Hai Phong Port',
    country: 'Vietnam',
    type: 'SEA',
  },
  {
    id: 'port-cnpvg',
    port_code: 'CNPVG',
    port_name: 'Shanghai Pudong International Airport',
    country: 'China',
    type: 'AIR',
  },
  {
    id: 'port-vnlso',
    port_code: 'VNLSO',
    port_name: 'Huu Nghi Border Gate',
    country: 'Vietnam',
    type: 'BORDER',
  },
];

function cloneRecords<T extends Record<string, unknown>>(records: T[]): T[] {
  return records.map((record) => ({ ...record }));
}

export function getPartners(): PartnerRecord[] {
  if (typeof window === 'undefined') return cloneRecords(DEFAULT_PARTNERS);
  const stored = window.localStorage.getItem(PARTNERS_KEY);
  if (!stored) return cloneRecords(DEFAULT_PARTNERS);
  try {
    return JSON.parse(stored);
  } catch {
    return cloneRecords(DEFAULT_PARTNERS);
  }
}

export function savePartners(data: PartnerRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PARTNERS_KEY, JSON.stringify(data));
}

export function getPorts(): PortRecord[] {
  if (typeof window === 'undefined') return cloneRecords(DEFAULT_PORTS);
  const stored = window.localStorage.getItem(PORTS_KEY);
  if (!stored) return cloneRecords(DEFAULT_PORTS);
  try {
    return JSON.parse(stored);
  } catch {
    return cloneRecords(DEFAULT_PORTS);
  }
}

export function savePorts(data: PortRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PORTS_KEY, JSON.stringify(data));
}

export function getItems(): ItemRecord[] {
  if (typeof window === 'undefined') return [];
  const stored = window.localStorage.getItem(ITEMS_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as ItemRecord[];
  } catch {
    return [];
  }
}

export function saveItems(data: ItemRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ITEMS_KEY, JSON.stringify(data));
}
