import type { ItemRecord, PartnerRecord, PortRecord } from '@shared/model/masterData';

const PARTNERS_KEY = 'kbfe.master.partners';
const PORTS_KEY = 'kbfe.master.ports';
const ITEMS_KEY = 'kbfe.master.items';

export function getPartners(): PartnerRecord[] {
  if (typeof window === 'undefined') return [];
  const stored = window.localStorage.getItem(PARTNERS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function savePartners(data: PartnerRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PARTNERS_KEY, JSON.stringify(data));
}

export function getPorts(): PortRecord[] {
  if (typeof window === 'undefined') return [];
  const stored = window.localStorage.getItem(PORTS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
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
