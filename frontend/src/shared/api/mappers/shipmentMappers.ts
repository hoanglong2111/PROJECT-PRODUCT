import { QuotationV1 } from '../quotations';
import { ShipmentCostV1, ShipmentDocumentStatusV1, ShipmentDocumentV1, ShipmentLoadTypeV1, ShipmentMilestoneV1, ShipmentModeV1, ShipmentV1 } from '../shipments';
import { ShipmentCost, ShipmentDocument, ShipmentMilestone, ShipmentRecord, ShipmentStatus } from '@shared/model/logistics';
import { dateOnly, deliveryOrderNo, toNumber } from './mapperShared';

export function normalizeShipmentMode(mode: ShipmentModeV1 | string | null | undefined): ShipmentRecord['shipping_mode'] {
  if (mode === 'AIR') return 'AIR';
  if (mode === 'ROAD' || mode === 'RAIL' || mode === 'MULTIMODAL' || mode === 'TRUCKING' || mode === 'OTHER') {
    return mode;
  }
  return 'SEA';
}

export function inferLoadTypeFromMode(mode: ShipmentModeV1 | string | null | undefined): ShipmentLoadTypeV1 | null {
  const normalized = String(mode ?? '').toUpperCase();
  if (normalized.includes('FCL')) return 'FCL';
  if (normalized.includes('LCL')) return 'LCL';
  if (normalized.includes('FTL')) return 'FTL';
  if (normalized.includes('LTL')) return 'LTL';
  return null;
}

export function mapV1ShipmentMilestone(milestone: ShipmentMilestoneV1): ShipmentMilestone {
  return {
    actual_date: milestone.actual_at ?? milestone.actual_date ?? milestone.done_at ?? null,
    id: milestone.id,
    milestone_code: milestone.milestone_code as ShipmentMilestone['milestone_code'],
    note: milestone.notes ?? milestone.note ?? null,
    planned_date: milestone.planned_at ?? milestone.planned_date ?? null,
    source: milestone.source === 'API' || milestone.source === 'EMAIL' ? milestone.source : 'MANUAL',
  };
}

export function mapV1ShipmentDocumentStatus(status: ShipmentDocumentStatusV1): ShipmentDocument['status'] {
  return status;
}

export function mapV1ShipmentDocument(document: ShipmentDocumentV1): ShipmentDocument {
  return {
    file_name: document.file_name,
    id: document.id,
    document_type: document.document_type,
    reject_reason: document.status === 'REJECTED' ? document.notes ?? undefined : undefined,
    status: mapV1ShipmentDocumentStatus(document.status),
    uploaded_at: document.received_at ?? document.update_at ?? document.create_at,
  };
}

export function mapV1ShipmentCost(cost: ShipmentCostV1): ShipmentCost {
  return {
    id: cost.id,
    cost_type: cost.cost_type,
    description: cost.description ?? null,
    amount: toNumber(cost.amount),
    currency_code: cost.currency_code,
    exchange_rate: toNumber(cost.exchange_rate, 1),
    alloc_method: cost.alloc_method,
    invoice_ref: cost.invoice_ref ?? null,
    notes: cost.notes ?? null,
  };
}

export type ShipmentRecordWithQuotation = ShipmentRecord & {
  final_quotation?: QuotationV1 | null;
};

export function mapV1Shipment(shipment: ShipmentV1): ShipmentRecordWithQuotation {
  const deliveryOrder = shipment.delivery_order;
  const purchaseOrder = deliveryOrder?.purchase_order;
  const vesselParts = [shipment.vessel_flight, shipment.voyage_no].filter(Boolean);

  // The customs channel (luồng xanh/vàng/đỏ) is only meaningful once the shipment has
  // cleared customs ("đã thông quan"). While in transit / pre-clearance there is no lane,
  // so we leave lane_status empty and every consumer (list, filter, detail) hides it.
  const hasCleared = shipment.status === 'CUSTOMS_CLEARED' || shipment.status === 'DELIVERED';

  return {
    carrier_name: shipment.carrier ?? shipment.forwarder?.forwarder_name ?? '',
    customs: {
      clearance_date: hasCleared ? dateOnly(shipment.update_at) : undefined,
      lane_status: hasCleared ? shipment.customs_channel ?? '' : '',
      stream: shipment.customs_channel ?? 'GREEN',
    },
    dest_port: shipment.pod ?? deliveryOrder?.destination_address ?? '',
    do_number: deliveryOrder ? deliveryOrderNo(deliveryOrder) : shipment.delivery_order_id,
    documents: (shipment.documents ?? []).map(mapV1ShipmentDocument),
    costs: (shipment.costs ?? []).map(mapV1ShipmentCost),
    final_quotation: shipment.final_quotation ?? null,
    etd: dateOnly(shipment.etd),
    eta: dateOnly(shipment.eta),
    atd: dateOnly(shipment.atd),
    ata: dateOnly(shipment.ata),
    bl_awb_no: shipment.bl_awb_no ?? '',
    id: shipment.id,
    milestones: (shipment.milestones ?? []).map(mapV1ShipmentMilestone),
    origin_port: shipment.pol ?? deliveryOrder?.origin_address ?? '',
    po_number: purchaseOrder?.po_no ?? deliveryOrder?.purchase_order_id ?? '',
    po_tasks: [],
    shipment_number: shipment.shipment_no,
    shipping_mode: normalizeShipmentMode(shipment.mode),
    load_type: shipment.load_type ?? inferLoadTypeFromMode(shipment.mode),
    status: shipment.status as ShipmentStatus,
    vessel_voyage: vesselParts.join(' / '),
    documents_complete: shipment.documents_complete,
    documents_outstanding: shipment.documents_outstanding,
    documents_unverified: shipment.documents_unverified,
  };
}
