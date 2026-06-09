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
      if (method === 'PATCH' && url.includes('/lot-allocation')) {
        let body: any = {};
        try {
          if (cfg.data) body = JSON.parse(cfg.data);
        } catch {}
        const poNumber = decodeURIComponent(url.split('/purchase-orders/')[1]?.split('/')[0] ?? '');
        const updated = mockData.updateMockPurchaseOrderLotAllocation(poNumber, body);
        return {
          data: { data: updated },
          status: updated ? 200 : 404,
          statusText: updated ? 'OK' : 'Not Found',
          headers: {},
          config: cfg,
        };
      }

      if (method === 'POST') {
        let body: any = {};
        try {
          if (cfg.data) body = JSON.parse(cfg.data);
        } catch {}

        const now = Date.now();
        const sourceLines = body.sourceLines || [];
        const lineItems = sourceLines.map((line: any, idx: number) => ({
          id: `po-item-${now}-${idx}`,
          source_pr_code: '',
          source_pr_line_id: '',
          item_id: line.itemId || null,
          item_code: line.itemCode,
          item_name: line.itemName,
          quantity: Number(line.quantity),
          unit: line.unit,
          unit_price: Number(line.unitPrice) || 0,
          expected_eta: line.expectedEta || body.expectedEta || null,
          warehouse_deadline_date: line.expectedEta || body.expectedEta || '2026-06-30',
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
          lot_number: line.lotNumber || 'Lot 1',
        }));
        const lotNames = Array.from(new Set(lineItems.map((line: any) => line.lot_number || 'Lot 1')));
        const newPo = {
          id: `po-${now}`,
          po_number: body.poNumber || `PO-${now}`,
          source_pr_codes: [],
          line_items: lineItems,
          supplier_code: body.supplierCode || 'SUP-UNKNOWN',
          supplier_name: body.supplierName || 'Unknown Supplier',
          status: 'DRAFT',
          order_date: body.orderDate || '2026-06-05',
          currency: body.currency || 'USD',
          total_amount: Number(body.totalAmount) || 0,
          sap_sync_status: 'SYNCED',
          linked_do_numbers: [],
          lots: lotNames.map((lotName, lotIndex) => ({
            id: `lot-${now}-${lotIndex + 1}`,
            lot_no: lotName,
            allocations: lineItems
              .filter((line: any) => (line.lot_number || 'Lot 1') === lotName)
              .map((line: any, allocationIndex: number) => ({
                id: `alloc-${now}-${lotIndex + 1}-${allocationIndex + 1}`,
                po_line_id: line.id,
                quantity: Number(line.quantity) || 0,
              })),
          })),
          po_type: body.poType || 'SEA',
          incoterm: body.incoterm || 'CIP',
          payment_term: body.paymentTerm || 'Net 30',
          expected_etd: body.expectedEtd || null,
          expected_eta: body.expectedEta || null,
          version: 1,
          sent_at: null,
          confirmed_date: null,
          warehouse_code: body.warehouseCode || 'WH001',
          flow_tags: lotNames.length > 1 ? ['SPLIT_PURCHASE'] : ['LINEAR'],
        };
        mockData.mockPurchaseOrders.push(newPo as any);
        const saved = mockData.updateMockPurchaseOrderLotAllocation(newPo.po_number, {
          lots: newPo.lots.map((lot: any) => ({ id: lot.id, lotNo: lot.lot_no })),
          lineAllocations: lineItems.map((line: any) => ({
            poLineId: line.id,
            lotNo: line.lot_number || 'Lot 1',
            quantity: Number(line.quantity) || 0,
          })),
        });
        return {
          data: { data: saved ?? newPo },
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
  } else if (url.includes('/shipments')) {
    config.adapter = async (cfg) => {
      if (method === 'POST') {
        let body: any = {};
        try {
          if (cfg.data) body = JSON.parse(cfg.data);
        } catch {}
        const now = Date.now();
        const newShipment = {
          id: `shp-${now}`,
          shipment_number: body.shipmentNumber,
          do_number: body.doNumber,
          po_number: body.poNumber,
          status: 'BOOKED',
          shipping_mode: body.shippingMode,
          carrier_name: body.carrierName || 'Hapag Lloyd',
          vessel_voyage: body.vesselVoyage || 'HAPAG V204',
          origin_port: body.originPort || 'Port of Ningbo',
          dest_port: body.destPort || 'Port of Cat Lai',
          etd: body.etd || '2026-06-15',
          eta: body.eta || '2026-06-29',
          customs: {
            stream: 'GREEN',
            lane_status: 'Thông quan tự động',
          },
          milestones: [
            { id: `m-new-1-${now}`, milestone_code: 'BOOKING_CONFIRMED', planned_date: body.etd || '2026-06-12', actual_date: body.etd || '2026-06-12', source: 'MANUAL', note: 'Booking confirmed' },
            { id: `m-new-2-${now}`, milestone_code: 'CARGO_READY', planned_date: body.etd || '2026-06-14', actual_date: null, source: 'API', note: null },
            { id: `m-new-3-${now}`, milestone_code: 'PICK_UP', planned_date: body.etd || '2026-06-15', actual_date: null, source: 'API', note: null },
            { id: `m-new-4-${now}`, milestone_code: 'BL_ISSUED', planned_date: body.etd || '2026-06-16', actual_date: null, source: 'API', note: null },
            { id: `m-new-5-${now}`, milestone_code: 'GATE_IN_POL', planned_date: body.etd || '2026-06-16', actual_date: null, source: 'API', note: null },
            { id: `m-new-6-${now}`, milestone_code: 'ATD', planned_date: body.etd || '2026-06-17', actual_date: null, source: 'API', note: null },
            { id: `m-new-7-${now}`, milestone_code: 'CUSTOM_DRAFT_SUBMITTED', planned_date: body.eta || '2026-06-20', actual_date: null, source: 'API', note: null },
            { id: `m-new-8-${now}`, milestone_code: 'AN_ATA', planned_date: body.eta || '2026-06-28', actual_date: null, source: 'API', note: null },
            { id: `m-new-9-${now}`, milestone_code: 'CUSTOM_CLEARED', planned_date: body.eta || '2026-06-29', actual_date: null, source: 'API', note: null },
            { id: `m-new-10-${now}`, milestone_code: 'EDO_DELIVERY', planned_date: body.eta || '2026-06-30', actual_date: null, source: 'API', note: null },
          ],
          documents: [
            { id: `d-new-1-${now}`, document_type: 'Hóa đơn thương mại (Commercial Invoice)', file_name: null, status: 'PENDING_UPLOAD' },
            { id: `d-new-2-${now}`, document_type: 'Phiếu đóng gói (Packing List)', file_name: null, status: 'PENDING_UPLOAD' },
            { id: `d-new-3-${now}`, document_type: 'Vận đơn nháp (Draft B/L)', file_name: null, status: 'PENDING_UPLOAD' },
            { id: `d-new-4-${now}`, document_type: 'Vận đơn chính thức (Official B/L)', file_name: null, status: 'PENDING_UPLOAD' },
            { id: `d-new-5-${now}`, document_type: 'Tờ khai hải quan (Customs Declaration)', file_name: null, status: 'PENDING_UPLOAD' },
          ],
          po_tasks: [
            { id: `t-new-1-${now}`, task_name: 'Duyệt báo giá vận chuyển', status: 'TODO', assignee_role: 'LOGISTICS' },
            { id: `t-new-2-${now}`, task_name: 'Xác nhận booking space', status: 'TODO', assignee_role: 'LOGISTICS' },
          ],
        };
        mockData.mockShipments.unshift(newShipment as any);
        return {
          data: { data: newShipment },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
        };
      }
      return {
        data: { data: mockData.mockShipments },
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
        } else if (url.includes('/shipments')) {
          data = mockData.mockShipments;
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
