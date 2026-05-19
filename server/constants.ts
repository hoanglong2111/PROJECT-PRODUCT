import type { AppRole } from '../src/auth/types';
import type { DeliveryOrder, LogisticsTask, Priority } from '../src/models/logistics';
import { APP_ROLES } from '../src/auth/types';

export const API_PREFIX = '/api';
export const PORT = Number(process.env.PORT ?? process.env.BE_PORT ?? 4000);
export const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, '');
export const CORS_ORIGINS = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);
export const CORS_ORIGIN = CORS_ORIGINS[0] ?? 'http://localhost:5173';
export const DATABASE_URL =
  process.env.DATABASE_URL ??
  (() => {
    if (process.env.RENDER === 'true' || process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL is required in production. Set it in the hosting service environment variables.');
    }

    return 'postgresql://postgres:postgres@localhost:5432/kbfe';
  })();
export const JWT_SECRET = process.env.JWT_SECRET ?? 'kbfe-dev-secret';
export const REQUIRED_DOCUMENTS = ['Invoice', 'Packing List', 'B/L'];
export const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const SHIPPING_METHODS: Array<DeliveryOrder['logistics_shipping']['shipping_method']> = ['SEA', 'AIR', 'ROAD'];
export const TASK_STATUSES: LogisticsTask['status'][] = ['TODO', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'COMPLETED', 'CANCELLED'];

export const roleGroups = {
  purchaseRequests: ['ADMIN', 'PIC_MANAGER', 'SALE_STAFF'] as AppRole[],
  purchaseOrders: ['ADMIN', 'PIC_MANAGER', 'SALE_STAFF', 'FINANCE_OFFICER'] as AppRole[],
  deliveryOrders: ['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'WAREHOUSE_STAFF'] as AppRole[],
  tasks: ['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'FINANCE_OFFICER', 'WAREHOUSE_STAFF'] as AppRole[],
};

export const readAllRoles = [...APP_ROLES];
