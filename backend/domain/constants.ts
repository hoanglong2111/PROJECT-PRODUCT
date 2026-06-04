import { env } from '../config/env';
import { APP_ROLES, type AppRole } from './auth';
import type { DeliveryOrder, LogisticsTask, Priority } from './logistics';

export const API_PREFIX = '/api';
export const PORT = env.port;
export const JWT_SECRET = env.jwtSecret;
export const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, '');
export const CORS_ORIGINS = env.corsOrigin.split(',').map(normalizeOrigin).filter(Boolean);
export const CORS_ORIGIN = CORS_ORIGINS[0] ?? 'http://localhost:5173';
export const REQUIRED_DOCUMENTS = ['Invoice', 'Packing List', 'B/L'];
export const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const SHIPPING_METHODS: Array<DeliveryOrder['logistics_shipping']['shipping_method']> = ['SEA', 'AIR', 'ROAD'];
export const TASK_STATUSES: LogisticsTask['status'][] = ['TODO', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'COMPLETED', 'CANCELLED'];

export const roleGroups = {
  purchaseRequests: ['ADMIN', 'PIC_MANAGER'] as AppRole[],
  purchaseOrders: ['ADMIN', 'PIC_MANAGER'] as AppRole[],
  deliveryOrders: ['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'WAREHOUSE_STAFF'] as AppRole[],
  tasks: ['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'FINANCE_OFFICER', 'WAREHOUSE_STAFF'] as AppRole[],
};

export const readAllRoles = [...APP_ROLES];
