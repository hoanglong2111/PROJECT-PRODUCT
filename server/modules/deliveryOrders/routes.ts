import { Router } from 'express';

import { authenticateRequest, authorizeRole } from '../../auth';
import { readAllRoles, roleGroups } from '../../constants';
import type { AuthenticatedRequest, CreateDeliveryOrderBody, UpdateDeliveryOrderBody } from '../../types';
import {
  attachDeliveryOrderDocument,
  createDeliveryOrder,
  listDeliveryOrderAttachments,
  listDeliveryOrders,
  updateDeliveryOrder,
} from './service';
import { parseMultipartUpload } from './uploads';
import { ApiError } from '../../errors';
import { ensureMilestonesForShipment, getMilestonesForShipment, isGd1MilestoneCode, updateMilestoneActualDate } from '../../services/milestones';
import { getShipmentCosts, addShipmentCost, deleteShipmentCost } from '../../services/landedCost';
import { pool } from '../../db';
import { runIdempotentMutation } from '../../services/reliability';

const costTypes = new Set(['FREIGHT', 'INSURANCE', 'CUSTOMS_DUTY', 'VAT', 'LOCAL_CHARGES', 'DEMURRAGE', 'OTHER']);
const allocationMethods = new Set(['BY_VALUE', 'BY_WEIGHT', 'BY_QTY']);
const milestoneSources = new Set(['MANUAL', 'API', 'EMAIL']);

function sendRouteError(response: any, error: any) {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;
  response.status(statusCode).json({ data: null, errors: [{ message: error.message }] });
}

export function createDeliveryOrdersRouter() {
  const router = Router();

  router.get('/delivery-orders', authenticateRequest, authorizeRole(readAllRoles), async (_request, response) => {
    response.json({ data: await listDeliveryOrders(), errors: [] });
  });

  router.post('/delivery-orders', authenticateRequest, authorizeRole(roleGroups.deliveryOrders), async (request: AuthenticatedRequest, response) => {
    await runIdempotentMutation(request, response, async () => {
      const deliveryOrder = await createDeliveryOrder(request.body as CreateDeliveryOrderBody);
      return { statusCode: 201, body: { data: deliveryOrder, errors: [] } };
    });
  });

  router.patch('/delivery-orders/:orderNumber', authenticateRequest, authorizeRole(roleGroups.deliveryOrders), async (request, response) => {
    const deliveryOrder = await updateDeliveryOrder(
      decodeURIComponent(String(request.params.orderNumber ?? '')),
      request.body as UpdateDeliveryOrderBody,
    );
    response.json({ data: deliveryOrder, errors: [] });
  });

  router.get('/delivery-orders/:orderNumber/attachments', authenticateRequest, authorizeRole(readAllRoles), async (request, response) => {
    const attachments = await listDeliveryOrderAttachments(decodeURIComponent(String(request.params.orderNumber ?? '')));
    response.json({ data: attachments, errors: [] });
  });

  router.post(
    '/delivery-orders/:orderNumber/attachments',
    authenticateRequest,
    authorizeRole(['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'WAREHOUSE_STAFF']),
    async (request: AuthenticatedRequest, response) => {
      const upload = await parseMultipartUpload(request);
      const result = await attachDeliveryOrderDocument({
        auth: request.auth,
        documentType: upload.documentType,
        file: upload.file,
        hblNumber: upload.hblNumber,
        orderNumber: decodeURIComponent(String(request.params.orderNumber ?? '')),
      });
      response.status(201).json({ data: result, errors: [] });
    },
  );

  // --- GD1 Milestones Endpoints ---
  router.get('/delivery-orders/:orderNumber/milestones', authenticateRequest, authorizeRole(readAllRoles), async (request: any, response: any) => {
    try {
      const orderNumber = decodeURIComponent(String(request.params.orderNumber ?? ''));
      const doRes = await pool.query<{ id: string; tenant_id: string | null }>('SELECT id, tenant_id FROM delivery_orders WHERE order_number = $1', [orderNumber]);
      if (doRes.rows.length === 0) {
        response.status(404).json({ data: null, errors: [{ message: 'Shipment not found' }] });
        return;
      }
      const shipmentId = doRes.rows[0].id as string;
      await ensureMilestonesForShipment(shipmentId, doRes.rows[0].tenant_id ?? null);
      const milestones = await getMilestonesForShipment(shipmentId);
      response.json({ data: milestones, errors: [] });
    } catch (err: any) {
      sendRouteError(response, err);
    }
  });

  router.patch('/delivery-orders/:orderNumber/milestones/:milestoneCode', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER']), async (request: any, response: any) => {
    try {
      const orderNumber = decodeURIComponent(String(request.params.orderNumber ?? ''));
      const milestoneCode = String(request.params.milestoneCode ?? '');
      if (!isGd1MilestoneCode(milestoneCode)) {
        throw new ApiError(400, `Invalid shipment milestone code: ${milestoneCode}`);
      }
      const doRes = await pool.query<{ id: string; tenant_id: string | null }>('SELECT id, tenant_id FROM delivery_orders WHERE order_number = $1', [orderNumber]);
      if (doRes.rows.length === 0) {
        response.status(404).json({ data: null, errors: [{ message: 'Shipment not found' }] });
        return;
      }
      const shipmentId = doRes.rows[0].id as string;
      await ensureMilestonesForShipment(shipmentId, doRes.rows[0].tenant_id ?? null);
      const { actualDate, note, source } = request.body;
      const normalizedSource = milestoneSources.has(source) ? source : 'MANUAL';
      const recordedBy = request.auth?.email || 'SYSTEM';

      await updateMilestoneActualDate(shipmentId, milestoneCode, actualDate, recordedBy, normalizedSource, note);
      response.json({ data: { success: true }, errors: [] });
    } catch (err: any) {
      sendRouteError(response, err);
    }
  });

  // --- GD1 Landed Cost Endpoints ---
  router.get('/delivery-orders/:orderNumber/costs', authenticateRequest, authorizeRole(readAllRoles), async (request: any, response: any) => {
    try {
      const orderNumber = decodeURIComponent(String(request.params.orderNumber ?? ''));
      const doRes = await pool.query('SELECT id FROM delivery_orders WHERE order_number = $1', [orderNumber]);
      if (doRes.rows.length === 0) {
        response.status(404).json({ data: null, errors: [{ message: 'Shipment not found' }] });
        return;
      }
      const shipmentId = doRes.rows[0].id as string;
      const costs = await getShipmentCosts(shipmentId);
      response.json({ data: costs, errors: [] });
    } catch (err: any) {
      sendRouteError(response, err);
    }
  });

  router.post('/delivery-orders/:orderNumber/costs', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER']), async (request: any, response: any) => {
    try {
      await runIdempotentMutation(request, response, async () => {
        const orderNumber = decodeURIComponent(String(request.params.orderNumber ?? ''));
        const doRes = await pool.query('SELECT id FROM delivery_orders WHERE order_number = $1', [orderNumber]);
        if (doRes.rows.length === 0) {
          throw new ApiError(404, 'Shipment not found');
        }
        const shipmentId = doRes.rows[0].id as string;
        const costType = String(request.body.costType ?? request.body.cost_type ?? '');
        const amount = Number(request.body.amount);
        const currencyCode = String(request.body.currencyCode ?? request.body.currency_code ?? request.body.currency ?? 'VND').toUpperCase();
        const exchangeRate = Number(request.body.exchangeRate ?? request.body.exchange_rate ?? 1);
        const allocMethod = String(request.body.allocMethod ?? request.body.alloc_method ?? 'BY_VALUE');
        const invoiceRef = request.body.invoiceRef ?? request.body.invoice_ref ?? request.body.note ?? null;

        if (!costTypes.has(costType)) {
          throw new ApiError(400, `Invalid shipment cost type: ${costType}`);
        }
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new ApiError(400, 'Shipment cost amount must be greater than 0.');
        }
        if (!/^[A-Z]{3}$/.test(currencyCode)) {
          throw new ApiError(400, 'currencyCode must be a 3-letter ISO currency code.');
        }
        if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
          throw new ApiError(400, 'exchangeRate must be greater than 0.');
        }
        if (!allocationMethods.has(allocMethod)) {
          throw new ApiError(400, `Invalid allocation method: ${allocMethod}`);
        }

        const costId = await addShipmentCost({
          tenant_id: 'tenant-001',
          shipment_id: shipmentId,
          cost_type: costType as any,
          amount,
          currency_code: currencyCode,
          exchange_rate: exchangeRate,
          alloc_method: allocMethod as any,
          invoice_ref: invoiceRef,
        });

        const createdCost = (await getShipmentCosts(shipmentId)).find((item) => item.id === costId) ?? { id: costId };
        return { statusCode: 201, body: { data: createdCost, errors: [] } };
      });
    } catch (err: any) {
      sendRouteError(response, err);
    }
  });

  router.delete('/delivery-orders/costs/:costId', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER']), async (request: any, response: any) => {
    try {
      const costId = String(request.params.costId ?? '');
      await deleteShipmentCost(costId);
      response.json({ data: { success: true }, errors: [] });
    } catch (err: any) {
      sendRouteError(response, err);
    }
  });

  return router;
}
