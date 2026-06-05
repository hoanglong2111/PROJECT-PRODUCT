import {
  mockPartners,
  mockPorts,
  mockItems,
  type PartnerRecord,
  type PortRecord,
  type ItemRecord,
} from '@features/master-data/mockData';

const PARTNERS_KEY = 'kbfe.master.partners';
const PORTS_KEY = 'kbfe.master.ports';
const ITEMS_KEY = 'kbfe.master.items';

function itemIdentity(item: Partial<ItemRecord>) {
  return `${item.item_name || ''}::${item.hs_code || ''}`.toLowerCase();
}

function mergeItemsWithDefaults(storedItems: ItemRecord[]) {
  const storedByCode = new Map(storedItems.map((item) => [item.item_code, item]));
  const storedByIdentity = new Map(storedItems.map((item) => [itemIdentity(item), item]));
  const usedCodes = new Set<string>();
  const usedIdentities = new Set<string>();

  const mergedDefaults = mockItems.map((defaultItem) => {
    const storedItem = storedByCode.get(defaultItem.item_code) ?? storedByIdentity.get(itemIdentity(defaultItem));

    if (!storedItem) {
      return defaultItem;
    }

    usedCodes.add(storedItem.item_code);
    usedIdentities.add(itemIdentity(storedItem));
    return { ...defaultItem, ...storedItem };
  });

  const customItems = storedItems.filter(
    (item) => !usedCodes.has(item.item_code) && !usedIdentities.has(itemIdentity(item)),
  );

  return [...mergedDefaults, ...customItems];
}

export function getPartners(): PartnerRecord[] {
  if (typeof window === 'undefined') return mockPartners;
  const stored = window.localStorage.getItem(PARTNERS_KEY);
  if (!stored) {
    window.localStorage.setItem(PARTNERS_KEY, JSON.stringify(mockPartners));
    return mockPartners;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return mockPartners;
  }
}

export function savePartners(data: PartnerRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PARTNERS_KEY, JSON.stringify(data));
}

export function getPorts(): PortRecord[] {
  if (typeof window === 'undefined') return mockPorts;
  const stored = window.localStorage.getItem(PORTS_KEY);
  if (!stored) {
    window.localStorage.setItem(PORTS_KEY, JSON.stringify(mockPorts));
    return mockPorts;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return mockPorts;
  }
}

export function savePorts(data: PortRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PORTS_KEY, JSON.stringify(data));
}

export function getItems(): ItemRecord[] {
  if (typeof window === 'undefined') return mockItems;
  const stored = window.localStorage.getItem(ITEMS_KEY);
  if (!stored) {
    window.localStorage.setItem(ITEMS_KEY, JSON.stringify(mockItems));
    return mockItems;
  }
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return mockItems;
    }

    const merged = mergeItemsWithDefaults(parsed as ItemRecord[]);
    window.localStorage.setItem(ITEMS_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return mockItems;
  }
}

export function saveItems(data: ItemRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ITEMS_KEY, JSON.stringify(data));
}
