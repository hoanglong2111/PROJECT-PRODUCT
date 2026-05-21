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

export function createDeliveryOrdersRouter() {
  const router = Router();

  router.get('/delivery-orders', authenticateRequest, authorizeRole(readAllRoles), async (_request, response) => {
    response.json({ data: await listDeliveryOrders(), errors: [] });
  });

  router.post('/delivery-orders', authenticateRequest, authorizeRole(roleGroups.deliveryOrders), async (request, response) => {
    const deliveryOrder = await createDeliveryOrder(request.body as CreateDeliveryOrderBody);
    response.status(201).json({ data: deliveryOrder, errors: [] });
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

  return router;
}
