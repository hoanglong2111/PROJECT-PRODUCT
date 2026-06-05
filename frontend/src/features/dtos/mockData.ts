export interface DtoQuote {
  id: string;
  quote_version: number;
  carrier_name: string;
  base_price: number;
  adjusted_price: number;
  fuel_price_date: string;
  fuel_ref_price: number;
  adjustment_formula: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
}

export interface DtoIssue {
  id: string;
  issue_type: string;
  description: string;
  reported_at: string;
  status: 'OPEN' | 'RESOLVED';
}

export interface DtoRecord {
  id: string;
  dto_number: string;
  shipment_id: string;
  do_number: string;
  status: 'CREATED' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'CLOSED';
  route_name: string;
  vehicle_plate: string;
  driver_name: string;
  driver_phone: string;
  fuel_ref_price: number;
  actual_delivery_date: string | null;
  pod_url: string | null;
  debit_note_number: string | null;
  issue_level: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  quotes: DtoQuote[];
  issues: DtoIssue[];
}

export const mockDtos: DtoRecord[] = [
  {
    id: 'dto-1001',
    dto_number: 'DTO-2026-0001',
    shipment_id: 'shp-c01007a1',
    do_number: 'DO-2026-0010',
    status: 'IN_TRANSIT',
    route_name: 'Cát Lái → Kho KBI Bình Dương',
    vehicle_plate: '51C-888.88',
    driver_name: 'Nguyễn Văn A',
    driver_phone: '0901234567',
    fuel_ref_price: 19500,
    actual_delivery_date: null,
    pod_url: null,
    debit_note_number: 'DN-998822',
    issue_level: 'LOW',
    quotes: [
      {
        id: 'quote-1-1',
        quote_version: 1,
        carrier_name: 'Logistics Hữu Nghị',
        base_price: 4500000,
        adjusted_price: 4620000,
        fuel_price_date: '2026-06-01',
        fuel_ref_price: 19000,
        adjustment_formula: 'base_price * (1 + (current_fuel - fuel_ref_price)/fuel_ref_price * 0.2)',
        status: 'APPROVED',
      },
      {
        id: 'quote-1-2',
        quote_version: 2,
        carrier_name: 'Vận tải Á Châu',
        base_price: 4400000,
        adjusted_price: 4450000,
        fuel_price_date: '2026-06-03',
        fuel_ref_price: 19000,
        adjustment_formula: 'base_price * (1 + (current_fuel - fuel_ref_price)/fuel_ref_price * 0.15)',
        status: 'SUBMITTED',
      }
    ],
    issues: [
      {
        id: 'issue-1',
        issue_type: 'Trễ giờ nhận hàng',
        description: 'Tài xế đến cảng Cát Lái muộn 1 tiếng do kẹt xe ở vòng xoay Mỹ Thủy',
        reported_at: '2026-06-05T08:00:00Z',
        status: 'RESOLVED',
      }
    ]
  },
  {
    id: 'dto-1002',
    dto_number: 'DTO-2026-0002',
    shipment_id: 'shp-c02008b2',
    do_number: 'DO-2026-0011',
    status: 'CREATED',
    route_name: 'Cảng Hải Phòng → Kho KBI Bắc Ninh',
    vehicle_plate: '',
    driver_name: '',
    driver_phone: '',
    fuel_ref_price: 19500,
    actual_delivery_date: null,
    pod_url: null,
    debit_note_number: null,
    issue_level: 'NONE',
    quotes: [
      {
        id: 'quote-2-1',
        quote_version: 1,
        carrier_name: 'Vận tải Sao Vàng',
        base_price: 7200000,
        adjusted_price: 7200000,
        fuel_price_date: '2026-06-04',
        fuel_ref_price: 19500,
        adjustment_formula: 'base_price * 1.0',
        status: 'DRAFT',
      }
    ],
    issues: []
  },
  {
    id: 'dto-1003',
    dto_number: 'DTO-2026-0003',
    shipment_id: 'shp-c03009c3',
    do_number: 'DO-2026-0012',
    status: 'DELIVERED',
    route_name: 'Kho Tân Sơn Nhất → Nhà máy KBI Đồng Nai',
    vehicle_plate: '29C-777.77',
    driver_name: 'Trần Văn B',
    driver_phone: '0987654321',
    fuel_ref_price: 19500,
    actual_delivery_date: '2026-06-04',
    pod_url: '/uploads/pod-dto-1003.pdf',
    debit_note_number: 'DN-998845',
    issue_level: 'NONE',
    quotes: [
      {
        id: 'quote-3-1',
        quote_version: 1,
        carrier_name: 'Logistics Hữu Nghị',
        base_price: 3200000,
        adjusted_price: 3200000,
        fuel_price_date: '2026-06-02',
        fuel_ref_price: 19500,
        adjustment_formula: 'base_price',
        status: 'APPROVED',
      }
    ],
    issues: []
  }
];
