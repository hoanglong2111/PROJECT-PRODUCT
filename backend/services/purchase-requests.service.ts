import type { PurchaseRequest } from '../domain/logistics';
import { createPurchaseRequest, updatePurchaseRequest, updatePurchaseRequestStatus } from '../models/logisticsPurchaseRequests';
import { readSnapshot } from '../models/logisticsSnapshots';
import { normalizePurchaseRequest } from '../models/logisticsTransforms';

export async function listPurchaseRequests() {
  return (await readSnapshot<PurchaseRequest[]>('purchase_requests')).map(normalizePurchaseRequest);
}

export { createPurchaseRequest, updatePurchaseRequest, updatePurchaseRequestStatus };
