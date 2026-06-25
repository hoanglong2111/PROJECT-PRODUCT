import type { ShipmentContainerV1 } from '@shared/api/shipmentContainers';
import type {
  DomesticTransportOrderStatusV1,
  DomesticTransportOrderV1,
} from '@shared/api/domesticTransportOrders';

export type ShipmentDeliveryState = 'NO_CONTAINERS' | 'UNALLOCATED' | 'IN_PROGRESS' | 'COMPLETE';

export type ShipmentDeliverySummary = {
  totalContainers: number;
  allocated: number;
  delivered: number;
  unallocated: number;
  deliveredDtoCount: number;
  totalDtoCount: number;
  latestPodAt: string | null;
  state: ShipmentDeliveryState;
};

// A DTO counts as "delivered to warehouse" once it has reached one of these statuses.
export const DELIVERED_DTO_STATUSES: ReadonlySet<DomesticTransportOrderStatusV1> = new Set([
  'DELIVERED',
  'POD_RECEIVED',
  'CLOSED',
]);

// Completeness is answered via CONTAINER COVERAGE (the only reliable per-DTO partition),
// not by summing DTO line qty (which copies the full shipment qty).
export function resolveShipmentDelivery(
  containers: ShipmentContainerV1[],
  dtos: DomesticTransportOrderV1[],
): ShipmentDeliverySummary {
  const deliveredDtoIds = new Set(
    dtos.filter((d) => DELIVERED_DTO_STATUSES.has(d.status)).map((d) => d.id),
  );
  const podDates = dtos
    .filter((d) => DELIVERED_DTO_STATUSES.has(d.status) && d.actual_delivery_at)
    .map((d) => d.actual_delivery_at as string)
    .sort();
  const latestPodAt = podDates.length ? podDates[podDates.length - 1] : null;

  const totalContainers = containers.length;
  const allocated = containers.filter((c) => c.dto_id).length;
  const delivered = containers.filter((c) => c.dto_id && deliveredDtoIds.has(c.dto_id)).length;
  const unallocated = totalContainers - allocated;

  const deliveredDtoCount = deliveredDtoIds.size;
  const totalDtoCount = dtos.length;

  let state: ShipmentDeliveryState;
  if (totalContainers === 0) state = 'NO_CONTAINERS';
  else if (allocated < totalContainers) state = 'UNALLOCATED';
  else if (delivered < totalContainers) state = 'IN_PROGRESS';
  else state = 'COMPLETE';

  return { totalContainers, allocated, delivered, unallocated, deliveredDtoCount, totalDtoCount, latestPodAt, state };
}
