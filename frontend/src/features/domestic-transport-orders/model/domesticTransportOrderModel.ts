import type { DomesticTransportOrderStatusV1 } from '@shared/api/domesticTransportOrders';
import { formatMoney } from '@shared/utils/money';

export type FormState = {
  actualDeliveryAt: string;
  actualPickupAt: string;
  destination: string;
  driverIdentityNo: string;
  driverName: string;
  driverPhone: string;
  note: string;
  origin: string;
  podDocumentRef: string;
  quoteAmount: string;
  quoteCurrency: string;
  scheduledDeliveryAt: string;
  scheduledPickupAt: string;
  truckVendorId: string | null;
  vehiclePlate: string;
  vehicleType: string;
  warehouse: string;
};

export const statusValues: Array<DomesticTransportOrderStatusV1 | ''> = [
  '',
  'DRAFT',
  'QUOTE_PENDING',
  'QUOTED',
  'QUOTE_CONFIRMED',
  'DISPATCHED',
  'IN_TRANSIT',
  'DELIVERED',
  'POD_RECEIVED',
  'CLOSED',
  'CANCELLED',
];

export const PAGE_SIZE = 20;

export const initialForm: FormState = {
  actualDeliveryAt: '',
  actualPickupAt: '',
  destination: '',
  driverIdentityNo: '',
  driverName: '',
  driverPhone: '',
  note: '',
  origin: '',
  podDocumentRef: '',
  quoteAmount: '',
  quoteCurrency: '',
  scheduledDeliveryAt: '',
  scheduledPickupAt: '',
  truckVendorId: null,
  vehiclePlate: '',
  vehicleType: '',
  warehouse: '',
};

export function optionalString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function toDateTimeInput(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function fromDateTimeInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export { formatDateTime } from '@shared/utils/date';

export function formatNumber(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return number.toLocaleString();
}

export function formatDtoMoney(amount: unknown, currencyCode: string | null | undefined) {
  const number = Number(amount);
  if (!Number.isFinite(number)) return '-';
  return formatMoney(number, currencyCode || 'VND');
}

export function formatContainers(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '-';
  return value || '-';
}

export function getErrorMessage(error: unknown, fallback = 'Request failed') {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
}
