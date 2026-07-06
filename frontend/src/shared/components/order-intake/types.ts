export type OrderLineFields = {
  customsProfile?: boolean;
  dimensions?: boolean;
  taxRate?: boolean;
  discountPct?: boolean;
  lineEta?: boolean;
};

export type OrderLineDraft = {
  clientId: string;
  line_no: number;
  item_id: string;
  item_description: string;
  qty: number;
  unit: string;
  unit_price: number;
  gross_weight_kg: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  note: string;
  item_customs_profile_id?: string;
  tax_rate?: number;
  discount_pct?: number;
  expected_eta_line?: string;
};

export function newOrderLine(index: number, defaults: Partial<OrderLineDraft> = {}): OrderLineDraft {
  return {
    clientId: `line-${Date.now()}-${index}`,
    line_no: index + 1,
    item_id: '',
    item_description: '',
    qty: 1,
    unit: 'PCS',
    unit_price: 0,
    gross_weight_kg: 0,
    note: '',
    ...defaults,
  };
}

export function orderLinesTotal(lines: OrderLineDraft[]): number {
  return lines.reduce((total, line) => total + (Number(line.qty) || 0) * (Number(line.unit_price) || 0), 0);
}
