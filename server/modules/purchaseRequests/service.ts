import type { PurchaseRequest } from '../../../src/models/logistics';
import { createPurchaseRequest, updatePurchaseRequest, updatePurchaseRequestStatus } from '../../services/logisticsPurchaseRequests';
import { readSnapshot } from '../../services/logisticsSnapshots';
import { normalizePurchaseRequest } from '../../services/logisticsTransforms';

export async function listPurchaseRequests() {
  return (await readSnapshot<PurchaseRequest[]>('purchase_requests')).map(normalizePurchaseRequest);
}

export { createPurchaseRequest, updatePurchaseRequest, updatePurchaseRequestStatus };
