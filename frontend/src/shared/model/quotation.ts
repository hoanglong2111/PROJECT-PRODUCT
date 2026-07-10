import type { ShippingMode } from './common';

export const quotationModeOptions: { value: string; label: string }[] = [
  { value: 'SEA_FCL', label: 'SEA FCL' },
  { value: 'SEA_LCL', label: 'SEA LCL' },
  { value: 'AIR', label: 'AIR' },
];

export type QuotationStatus =
  | 'DRAFT'
  | 'PRELIMINARY_SENT'
  | 'OFFICIAL_SENT'
  | 'APPROVED'
  | 'REJECTED'
  | 'REVISION_REQUESTED'
  | 'BOOKED';

export type Quotation = {
  id: string;
  quoteNumber: string;
  requestCode: string;
  shippingMode: ShippingMode;
  status: QuotationStatus;
  preliminaryDueAt: string;
  preliminarySentAt: string | null;
  officialDueAt: string;
  officialSentAt: string | null;
  autoApproveAt: string | null;
  customerResponseAt: string | null;
  quoteAmount: number | string | null;
  currency: string | null;
  bookingNumber: string | null;
  bookingConfirmedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};
