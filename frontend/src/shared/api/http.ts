import axios from 'axios';
import { mockUsers, generateMockJwt, parseJwtPayload } from './mockAuth';
import * as mockData from './mockData';

export const AUTH_TOKEN_STORAGE_KEY = 'kbfe.auth.token';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  timeout: 15_000,
});

export function setHttpAuthToken(token: string | null) {
  if (token) {
    http.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete http.defaults.headers.common.Authorization;
}

export function getApiErrorMessage(error: unknown, fallback = 'Could not determine error details.') {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as { errors?: Array<{ message?: string }> } | undefined;
    const apiMessage = responseData?.errors?.find((item) => item.message)?.message;

    return apiMessage ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

http.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();
  const url = config.url || '';

  if (method === 'POST') {
    const headers = config.headers;
    if (headers && !headers['Idempotency-Key']) {
      headers['Idempotency-Key'] =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }

  // Gỡ Auth, PO, Dashboard, Tasks, Stats, Preferences endpoints ra, mock toàn diện
  if (url.endsWith('/auth/login')) {
    config.adapter = async (cfg) => {
      let email = 'admin@kbfe.local';
      try {
        if (cfg.data) {
          const parsed = JSON.parse(cfg.data);
          if (parsed.email) {
            email = parsed.email;
          }
        }
      } catch {}

      const user = Object.values(mockUsers).find((u) => u.email === email) || mockUsers['usr-admin-001'];
      const token = await generateMockJwt(user.id, user.email, user.role);

      setHttpAuthToken(token);

      return {
        data: { data: { token, user } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: cfg,
      };
    };
  } else if (url.endsWith('/auth/me')) {
    config.adapter = async (cfg) => {
      const authHeader = cfg.headers?.Authorization || http.defaults.headers.common.Authorization;
      const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      const payload = parseJwtPayload(token);
      const user = payload ? mockUsers[payload.sub] : mockUsers['usr-admin-001'];
      return {
        data: { data: user || mockUsers['usr-admin-001'] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: cfg,
      };
    };
  } else if (url.includes('/users/me/preferences')) {
    config.adapter = async (cfg) => {
      if (method === 'PUT') {
        let prefs = {};
        try {
          if (cfg.data) {
            prefs = JSON.parse(cfg.data);
          }
        } catch {}
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('kbfe.mock.preferences', JSON.stringify(prefs));
        }
        return {
          data: { data: prefs },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
        };
      } else {
        let prefs = {
          colorPreset: 'emerald',
          eventTheme: 'default',
          visualTheme: 'modern_teal',
          density: 'comfortable',
          appearanceMode: 'light',
          language: 'vi',
        };
        if (typeof window !== 'undefined') {
          const stored = window.localStorage.getItem('kbfe.mock.preferences');
          if (stored) {
            try {
              prefs = JSON.parse(stored);
            } catch {}
          }
        }
        return {
          data: { data: prefs },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
        };
      }
    };
  } else if (url.includes('/purchase-orders')) {
    config.adapter = async (cfg) => {
      if (method === 'POST') {
        let body: any = {};
        try {
          if (cfg.data) body = JSON.parse(cfg.data);
        } catch {}

        const newPo = {
          id: `po-${Date.now()}`,
          po_number: body.poNumber || `PO-${Date.now()}`,
          source_pr_codes: [],
          line_items: (body.sourceLines || []).map((line: any, idx: number) => ({
            id: `po-item-${Date.now()}-${idx}`,
            source_pr_code: '',
            source_pr_line_id: '',
            item_id: line.itemId || null,
            item_code: line.itemCode,
            item_name: line.itemName,
            quantity: Number(line.quantity),
            unit: line.unit,
            warehouse_deadline_date: '2026-06-30',
            warehouse_code: body.warehouseCode || 'WH001',
            item_group: line.itemGroup || '',
            source_reference: line.sourceReference || '',
            declaration_type: line.declarationType || '',
            hs_code: line.hsCode || '',
            duty_rate: Number(line.dutyRate) || 0,
            vat_rate: Number(line.vatRate) || 0,
            tariff_code: line.tariffCode || '',
            classification_code: line.classificationCode || '',
            co_note: line.coNote || '',
            tax_note: line.taxNote || '',
          })),
          supplier_code: body.supplierCode || 'SUP-UNKNOWN',
          supplier_name: body.supplierName || 'Unknown Supplier',
          status: 'SAP_PENDING',
          order_date: body.orderDate || '2026-06-05',
          currency: body.currency || 'USD',
          total_amount: Number(body.totalAmount) || 0,
          sap_sync_status: 'PENDING',
          linked_do_numbers: [],
          warehouse_code: body.warehouseCode || 'WH001',
          flow_tags: ['LINEAR'],
        };
        mockData.mockPurchaseOrders.push(newPo as any);
        return {
          data: { data: newPo },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
        };
      }
      return {
        data: { data: mockData.mockPurchaseOrders },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: cfg,
      };
    };
  } else if (url.includes('/delivery-orders')) {
    config.adapter = async (cfg) => {
      return {
        data: { data: mockData.mockDeliveryOrders },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: cfg,
      };
    };
  } else if (url.includes('/tasks')) {
    config.adapter = async (cfg) => {
      return {
        data: { data: mockData.mockTasks },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: cfg,
      };
    };
  } else if (url.includes('/dashboard/stats')) {
    config.adapter = async (cfg) => {
      return {
        data: { data: mockData.mockDashboardStats },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: cfg,
      };
    };
  } else if (url.includes('/sla/alerts')) {
    config.adapter = async (cfg) => {
      return {
        data: { data: mockData.mockSlaAlerts },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: cfg,
      };
    };
  } else if (url.includes('/domestic-transport-orders')) {
    config.adapter = async (cfg) => {
      return {
        data: { data: mockData.mockDomesticTransportOrders },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: cfg,
      };
    };
  } else if (url.includes('/issues')) {
    config.adapter = async (cfg) => {
      return {
        data: { data: mockData.mockIssues },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: cfg,
      };
    };
  }

  return config;
});

// Fallback response interceptor to handle any other unexpected 401/403/network errors gracefully
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const cfg = error.config;
    if (cfg) {
      const url = cfg.url || '';
      if (cfg.method?.toUpperCase() === 'GET') {
        let data: any = [];
        if (url.includes('/purchase-orders')) {
          data = mockData.mockPurchaseOrders;
        } else if (url.includes('/delivery-orders')) {
          data = mockData.mockDeliveryOrders;
        } else if (url.includes('/tasks')) {
          data = mockData.mockTasks;
        } else if (url.includes('/dashboard/stats')) {
          data = mockData.mockDashboardStats;
        } else if (url.includes('/sla/alerts')) {
          data = mockData.mockSlaAlerts;
        } else if (url.includes('/domestic-transport-orders')) {
          data = mockData.mockDomesticTransportOrders;
        } else if (url.includes('/issues')) {
          data = mockData.mockIssues;
        }
        return {
          data: { data },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
        };
      }
      return {
        data: { data: { success: true } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: cfg,
      };
    }
    return Promise.reject(error);
  }
);

if (typeof window !== 'undefined') {
  setHttpAuthToken(window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY));
}
