import type { AppRole, AuthUser } from '@shared/auth/types';

export type GlobalSearchKind = 'purchase_request' | 'purchase_order' | 'delivery_order' | 'task' | 'account';

export type GlobalSearchResult = {
  id: string;
  kind: GlobalSearchKind;
  title: string;
  subtitle: string;
  href: string;
  status?: string;
  meta?: string;
};

export type CreateUserPayload = {
  avatarUrl: string | null;
  department: string;
  email: string;
  fullName: string;
  password: string;
  position: string;
  role: AppRole;
};

export type ExchangeRate = {
  currency: string;
  rate: number;
};

export type ExchangeRatesPayload = {
  base: string;
  nextUpdateAt: string | null;
  provider: string;
  rates: ExchangeRate[];
  updatedAt: string;
};

const UI_USERS_STORAGE_KEY = 'kbfe.ui.users';

function readUsers() {
  if (typeof window === 'undefined') {
    return [];
  }

  const stored = window.localStorage.getItem(UI_USERS_STORAGE_KEY);
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as AuthUser[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: AuthUser[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(UI_USERS_STORAGE_KEY, JSON.stringify(users));
}

export async function fetchGlobalSearch(query: string): Promise<GlobalSearchResult[]> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) {
    return [];
  }

  return [];
}

export async function fetchUsers(): Promise<AuthUser[]> {
  return readUsers();
}

export async function createUser(payload: CreateUserPayload): Promise<AuthUser> {
  const user: AuthUser = {
    avatarUrl: payload.avatarUrl,
    defaultWarehouseCode: null,
    department: payload.department,
    email: payload.email,
    fullName: payload.fullName,
    id: `ui-user-${Date.now()}`,
    operationFocus: null,
    phoneNumber: null,
    position: payload.position,
    preferredModulePath: '/dashboard',
    profileNote: null,
    role: payload.role,
    workLocation: null,
    workShift: null,
  };
  saveUsers([...readUsers(), user]);
  return user;
}

export async function fetchExchangeRates(base = 'USD'): Promise<ExchangeRatesPayload> {
  const normalizedBase = base.trim().toUpperCase() || 'USD';
  return {
    base: normalizedBase,
    nextUpdateAt: null,
    provider: 'ui-only',
    rates: [],
    updatedAt: new Date().toISOString(),
  } satisfies ExchangeRatesPayload;
}
