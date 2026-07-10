import { DeliveryOrderV1, fetchDeliveryOrdersV1 } from '../deliveryOrders';
import { fetchShipmentsV1 } from '../shipments';
import { fetchCurrencies, fetchSuppliers } from '../tradeMasterData';

export function toNumber(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

export function sumNumbers(values: unknown[]) {
  return values.reduce<number>((total, value) => total + toNumber(value), 0);
}

export function dateOnly(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '';
}

export function deliveryOrderNo(deliveryOrder: DeliveryOrderV1) {
  return deliveryOrder.do_no ?? deliveryOrder.delivery_order_no ?? deliveryOrder.id;
}

export function uiId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

export function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export async function resolveDeliveryOrderId(value: string) {
  const response = await fetchDeliveryOrdersV1({ page: 1, limit: 100, search: value });
  const deliveryOrder = response.data.find((order) => order.id === value || deliveryOrderNo(order) === value);
  if (!deliveryOrder) {
    throw new Error(`Delivery order ${value} not found`);
  }
  return deliveryOrder.id;
}

export async function resolveSupplierId(value: string) {
  const response = await fetchSuppliers({ page: 1, limit: 100, role: 'FORWARDER', is_active: true });
  const suppliers = response.data.length > 0
    ? response.data
    : (await fetchSuppliers({ page: 1, limit: 100, is_active: true })).data;
  const supplier = suppliers.find(
    (item) => item.id === value || item.supplier_code === value || item.supplier_name === value,
  );
  if (!supplier) {
    throw new Error(`Forwarder ${value} not found`);
  }
  return supplier.id;
}

export async function resolveCurrencyId(value: string | null | undefined) {
  const currencyCode = value?.trim() || 'USD';
  const response = await fetchCurrencies({ page: 1, limit: 100, is_active: true });
  const currency = response.data.find(
    (item) => item.id === currencyCode || item.currency_code === currencyCode,
  );
  if (!currency) {
    throw new Error(`Currency ${currencyCode} not found`);
  }
  return currency.currency_code;
}

export async function resolveShipmentId(value: string) {
  const response = await fetchShipmentsV1({ page: 1, limit: 100, search: value });
  const shipment = response.data.find((item) => item.id === value || item.shipment_no === value);
  if (!shipment) {
    throw new Error(`Shipment ${value} not found`);
  }
  return shipment.id;
}
