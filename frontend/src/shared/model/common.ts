export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type UserRef = {
  user_id: string;
  name: string;
  department: string;
};

export type ShippingMode = 'AIR' | 'FCL' | 'LCL';

export type DocumentReviewStatus =
  | 'WAITING_DOCUMENTS'
  | 'READY_FOR_CHECK'
  | 'MISMATCH'
  | 'DRAFT_BL_CONFIRMED'
  | 'FINAL_BL_CONFIRMED';

export type FinanceChargeType = 'SELLING' | 'BUYING' | 'OBH';

export type CustomsChannel = 'GREEN' | 'YELLOW' | 'RED';

export type MblType = 'COPY' | 'ORIGINAL' | 'SEAWAY_BILL' | 'SURRENDERED';

export type SlaStatus = 'ON_TRACK' | 'OVERDUE' | 'DONE';

export type CustomsStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'CLEARED'
  | 'NEEDS_DOCUMENTS'
  | 'INSPECTION'
  | 'VIOLATION_HANDLING';

export type CustomsLaneStatus =
  | 'GREEN_CLEARANCE'
  | 'YELLOW_NEED_SUPPLEMENT'
  | 'RED_FIELD_INSPECTION'
  | 'RED_VIOLATION_HANDLING'
  | 'RELEASE_READY';

export type AdvanceSettlementStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'SETTLED';

export type DriveDossierStatus = 'READY' | 'PENDING_CONFIG' | 'BLOCKED' | 'SYNCED' | 'FAILED';

export type BusinessFlowTag =
  | 'LINEAR'
  | 'BULK_PURCHASE'
  | 'SPLIT_PURCHASE'
  | 'PARTIAL_DELIVERY'
  | 'CONTAINER_CONSOLIDATION';
