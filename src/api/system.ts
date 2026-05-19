import { http } from './http';
import type { AppRole, AuthUser } from '../auth/types';

type ApiResponse<T> = {
  data: T;
  errors?: unknown[];
  meta?: Record<string, unknown>;
};

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

export async function fetchGlobalSearch(query: string) {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) {
    return [];
  }

  const response = await http.get<ApiResponse<GlobalSearchResult[]>>('/search', {
    params: { q: trimmedQuery },
  });
  return response.data.data;
}

export async function fetchUsers() {
  const response = await http.get<ApiResponse<AuthUser[]>>('/users');
  return response.data.data;
}

export async function createUser(payload: CreateUserPayload) {
  const response = await http.post<ApiResponse<AuthUser>>('/users', payload);
  return response.data.data;
}

export async function fetchExchangeRates(base = 'USD') {
  const normalizedBase = base.trim().toUpperCase() || 'USD';
  const response = await http.get<ApiResponse<ExchangeRatesPayload>>('/exchange-rates', {
    params: { base: normalizedBase },
  });
  return response.data.data;
}
