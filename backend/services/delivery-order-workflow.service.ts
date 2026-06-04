import type { Gd1AllocMethod, Gd1CostType } from '../domain/logistics';
import type { TokenPayload } from '../domain/types';
import { findShipmentByOrderNumber } from '../models/delivery-order-workflow';
import { addShipmentCost, deleteShipmentCost, getShipmentCosts } from '../models/landedCost';
import {
  ensureMilestonesForShipment,
  getMilestonesForShipment,
  isGd1MilestoneCode,
  updateMilestoneActualDate,
} from '../models/milestones';
import { ApiError } from '../utils/errors';

const costTypes = new Set(['FREIGHT', 'INSURANCE', 'CUSTOMS_DUTY', 'VAT', 'LOCAL_CHARGES', 'DEMURRAGE', 'OTHER']);
const allocationMethods = new Set(['BY_VALUE', 'BY_WEIGHT', 'BY_QTY']);
const milestoneSources = new Set(['MANUAL', 'API', 'EMAIL']);

async function requireShipment(orderNumber: string) {
  const shipment = await findShipmentByOrderNumber(orderNumber);
  if (!shipment) {
    throw new ApiError(404, 'Shipment not found');
  }

  return shipment;
}

export async function listShipmentMilestones(orderNumber: string) {
  const shipment = await requireShipment(orderNumber);
  await ensureMilestonesForShipment(shipment.id, shipment.tenant_id);
  return getMilestonesForShipment(shipment.id);
}

export async function recordShipmentMilestone(
  orderNumber: string,
  milestoneCode: string,
  body: Record<string, unknown>,
  auth?: TokenPayload,
) {
  if (!isGd1MilestoneCode(milestoneCode)) {
    throw new ApiError(400, `Invalid shipment milestone code: ${milestoneCode}`);
  }

  const shipment = await requireShipment(orderNumber);
  await ensureMilestonesForShipment(shipment.id, shipment.tenant_id);
  const source = String(body.source ?? '');
  await updateMilestoneActualDate(
    shipment.id,
    milestoneCode,
    typeof body.actualDate === 'string' ? body.actualDate : null,
    auth?.email || 'SYSTEM',
    milestoneSources.has(source) ? source : 'MANUAL',
    typeof body.note === 'string' ? body.note : null,
  );
}

export async function listShipmentCosts(orderNumber: string) {
  return getShipmentCosts((await requireShipment(orderNumber)).id);
}

export async function createShipmentCost(orderNumber: string, body: Record<string, unknown>) {
  const shipment = await requireShipment(orderNumber);
  const costType = String(body.costType ?? body.cost_type ?? '');
  const amount = Number(body.amount);
  const currencyCode = String(body.currencyCode ?? body.currency_code ?? body.currency ?? 'VND').toUpperCase();
  const exchangeRate = Number(body.exchangeRate ?? body.exchange_rate ?? 1);
  const allocMethod = String(body.allocMethod ?? body.alloc_method ?? 'BY_VALUE');
  const invoiceRef = body.invoiceRef ?? body.invoice_ref ?? body.note ?? null;

  if (!costTypes.has(costType)) throw new ApiError(400, `Invalid shipment cost type: ${costType}`);
  if (!Number.isFinite(amount) || amount <= 0) throw new ApiError(400, 'Shipment cost amount must be greater than 0.');
  if (!/^[A-Z]{3}$/.test(currencyCode)) throw new ApiError(400, 'currencyCode must be a 3-letter ISO currency code.');
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) throw new ApiError(400, 'exchangeRate must be greater than 0.');
  if (!allocationMethods.has(allocMethod)) throw new ApiError(400, `Invalid allocation method: ${allocMethod}`);

  const costId = await addShipmentCost({
    tenant_id: 'tenant-001',
    shipment_id: shipment.id,
    cost_type: costType as Gd1CostType,
    amount,
    currency_code: currencyCode,
    exchange_rate: exchangeRate,
    alloc_method: allocMethod as Gd1AllocMethod,
    invoice_ref: invoiceRef as string | null,
  });

  return (await getShipmentCosts(shipment.id)).find((item) => item.id === costId) ?? { id: costId };
}

export async function removeShipmentCost(costId: string) {
  await deleteShipmentCost(costId);
}
