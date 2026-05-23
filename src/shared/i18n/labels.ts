import type { AppRole } from '@shared/auth/types';
import type { BusinessFlowTag, DeliveryOrder, Priority, TaskRole } from '@/models/logistics';
import type { AppearanceMode, DensityPreference, VisualTheme, WorkspaceLanguage } from '@shared/preferences/WorkspacePreferencesContext';

export type ShippingMethod = DeliveryOrder['logistics_shipping']['shipping_method'];
export type SearchKind = 'purchase_request' | 'purchase_order' | 'delivery_order' | 'task' | 'account';

export const roleLabels: Record<WorkspaceLanguage, Record<AppRole, string>> = {
  en: {
    ADMIN: 'Admin',
    CUSTOMS_OFFICER: 'Customs Officer',
    FINANCE_OFFICER: 'Finance Officer',
    PIC_MANAGER: 'PIC Manager',
    PORT_OFFICER: 'Port Officer',
    SALE_STAFF: 'Sale Staff',
    WAREHOUSE_STAFF: 'Warehouse Staff',
  },
  vi: {
    ADMIN: 'Quản trị viên',
    CUSTOMS_OFFICER: 'Nhân viên hải quan',
    FINANCE_OFFICER: 'Nhân viên tài chính',
    PIC_MANAGER: 'PIC Manager',
    PORT_OFFICER: 'Nhân viên cảng',
    SALE_STAFF: 'Nhân viên sale',
    WAREHOUSE_STAFF: 'Nhân viên kho',
  },
};

export const taskRoleLabels: Record<WorkspaceLanguage, Record<TaskRole, string>> = {
  en: {
    'Customs Officer': 'Customs Officer',
    'Finance Officer': 'Finance Officer',
    'PIC Manager': 'PIC Manager',
    'Port Officer': 'Port Officer',
    'Sale Staff': 'Sale Staff',
    'Warehouse Staff': 'Warehouse Staff',
  },
  vi: {
    'Customs Officer': 'Nhân viên hải quan',
    'Finance Officer': 'Nhân viên tài chính',
    'PIC Manager': 'PIC Manager',
    'Port Officer': 'Nhân viên cảng',
    'Sale Staff': 'Nhân viên sale',
    'Warehouse Staff': 'Nhân viên kho',
  },
};

export const priorityLabels: Record<WorkspaceLanguage, Record<Priority, string>> = {
  en: {
    HIGH: 'High',
    LOW: 'Low',
    MEDIUM: 'Medium',
    URGENT: 'Urgent',
  },
  vi: {
    HIGH: 'Cao',
    LOW: 'Thấp',
    MEDIUM: 'Trung bình',
    URGENT: 'Khẩn cấp',
  },
};

export const shippingMethodLabels: Record<WorkspaceLanguage, Record<ShippingMethod, string>> = {
  en: {
    AIR: 'Air',
    ROAD: 'Road',
    SEA: 'Sea',
  },
  vi: {
    AIR: 'Hàng không',
    ROAD: 'Đường bộ',
    SEA: 'Đường biển',
  },
};

export const appearanceModeLabels: Record<WorkspaceLanguage, Record<AppearanceMode, string>> = {
  en: {
    auto: 'Auto',
    dark: 'Dark',
    light: 'Light',
  },
  vi: {
    auto: 'Tự động',
    dark: 'Tối',
    light: 'Sáng',
  },
};

export const visualThemeLabels: Record<WorkspaceLanguage, Record<VisualTheme, string>> = {
  en: {
    'blue-sight': 'Blue Sight',
    'high-contrast': 'High Contrast',
    standard: 'Standard',
    'yellow-sight': 'Yellow Sight',
  },
  vi: {
    'blue-sight': 'Blue Sight',
    'high-contrast': 'Tương phản cao',
    standard: 'Tiêu chuẩn',
    'yellow-sight': 'Yellow Sight',
  },
};

export const densityLabels: Record<WorkspaceLanguage, Record<DensityPreference, string>> = {
  en: {
    compact: 'Compact',
    standard: 'Standard',
  },
  vi: {
    compact: 'Gọn',
    standard: 'Tiêu chuẩn',
  },
};

export const departmentLabels: Record<WorkspaceLanguage, Record<string, string>> = {
  en: {
    Finance: 'Finance',
    'Import Customs': 'Import Customs',
    'IT Operations': 'IT Operations',
    'Port Operations': 'Port Operations',
    Purchasing: 'Purchasing',
    'Sales Operations': 'Sales Operations',
    Warehouse: 'Warehouse',
  },
  vi: {
    Finance: 'Tài chính',
    'Import Customs': 'Hải quan nhập khẩu',
    'IT Operations': 'Vận hành CNTT',
    'Port Operations': 'Vận hành cảng',
    Purchasing: 'Thu mua',
    'Sales Operations': 'Vận hành bán hàng',
    Warehouse: 'Kho',
  },
};

export const languageLabels: Record<WorkspaceLanguage, Record<WorkspaceLanguage, string>> = {
  en: {
    en: 'English',
    vi: 'Vietnamese',
  },
  vi: {
    en: 'Tiếng Anh',
    vi: 'Tiếng Việt',
  },
};

export const currencyCountryLabels: Record<WorkspaceLanguage, Record<string, string>> = {
  en: {
    AUD: 'Australia',
    CAD: 'Canada',
    CHF: 'Switzerland',
    CNY: 'China',
    EUR: 'Eurozone',
    GBP: 'United Kingdom',
    HKD: 'Hong Kong',
    IDR: 'Indonesia',
    INR: 'India',
    JPY: 'Japan',
    KRW: 'South Korea',
    LAK: 'Laos',
    MYR: 'Malaysia',
    PHP: 'Philippines',
    SGD: 'Singapore',
    THB: 'Thailand',
    TWD: 'Taiwan',
    USD: 'United States',
    VND: 'Vietnam',
  },
  vi: {
    AUD: 'Úc',
    CAD: 'Canada',
    CHF: 'Thụy Sĩ',
    CNY: 'Trung Quốc',
    EUR: 'Khu vực đồng Euro',
    GBP: 'Vương quốc Anh',
    HKD: 'Hồng Kông',
    IDR: 'Indonesia',
    INR: 'Ấn Độ',
    JPY: 'Nhật Bản',
    KRW: 'Hàn Quốc',
    LAK: 'Lào',
    MYR: 'Malaysia',
    PHP: 'Philippines',
    SGD: 'Singapore',
    THB: 'Thái Lan',
    TWD: 'Đài Loan',
    USD: 'Hoa Kỳ',
    VND: 'Việt Nam',
  },
};

export const statusLabels: Record<WorkspaceLanguage, Record<string, string>> = {
  en: {
    APPROVED: 'Approved',
    ARRIVED_PORT: 'Arrived port',
    BLOCKED: 'Blocked',
    CANCELLED: 'Cancelled',
    CLOSED: 'Closed',
    COMPLETED: 'Completed',
    CONFIRMED: 'Confirmed',
    CONVERTED_TO_PO: 'PO created',
    BOOKED: 'Booked',
    CREATED: 'Created',
    COPY: 'Copy',
    CUSTOMS_PROCESSING: 'Customs',
    DRAFT: 'Draft',
    DELAYED: 'Delayed',
    DELIVERED: 'Delivered',
    DONE: 'Done',
    FAILED: 'Failed',
    FINAL_BL_CONFIRMED: 'Final B/L confirmed',
    GREEN_CLEARANCE: 'Green clearance',
    IN_PROGRESS: 'In progress',
    IN_PRODUCTION: 'In production',
    IN_TRANSIT: 'In transit',
    INSPECTION: 'Inspection',
    ISSUED: 'Issued',
    MISMATCH: 'Mismatch',
    NEW: 'New',
    NEEDS_DOCUMENTS: 'Needs documents',
    OFFICIAL_SENT: 'Official sent',
    ON_TRACK: 'On track',
    ORIGINAL: 'Original',
    OVERDUE: 'Overdue',
    PARTIALLY_DELIVERED: 'Partially delivered',
    PENDING: 'Pending',
    PENDING_APPROVAL: 'Pending approval',
    PENDING_CONFIG: 'Pending config',
    PRELIMINARY_SENT: 'Preliminary sent',
    RED_FIELD_INSPECTION: 'Red - inspection',
    RED_VIOLATION_HANDLING: 'Red - violation',
    REJECTED: 'Rejected',
    READY_FOR_CHECK: 'Ready for check',
    READY: 'Ready',
    RELEASE_READY: 'Release ready',
    REQUESTED: 'Requested',
    REVISION_REQUESTED: 'Revision requested',
    SAP_PENDING: 'SAP pending',
    SAP_SYNCED: 'SAP synced',
    SEAWAY_BILL: 'Seaway Bill',
    SENT_TO_ACC: 'Sent to Acc',
    SETTLED: 'Settled',
    SUBMITTED: 'Submitted',
    SURRENDERED: 'Surrendered',
    SYNCED: 'Synced',
    SYNC_FAILED: 'Sync failed',
    SYNC_INCOMPLETE: 'Sync incomplete',
    TODO: 'Todo',
    VIOLATION_HANDLING: 'Violation handling',
    WAITING: 'Waiting',
    WAITING_DOCUMENTS: 'Waiting documents',
    WAREHOUSE_PENDING: 'Warehouse pending',
    YELLOW_NEED_SUPPLEMENT: 'Yellow - supplement',
    DRAFT_BL_CONFIRMED: 'Draft B/L confirmed',
    CLEARED: 'Cleared',
  },
  vi: {
    APPROVED: 'Đã duyệt',
    ARRIVED_PORT: 'Đến cảng',
    BLOCKED: 'Bị chặn',
    CANCELLED: 'Đã hủy',
    CLOSED: 'Đã đóng',
    COMPLETED: 'Hoàn tất',
    CONFIRMED: 'Đã xác nhận',
    CONVERTED_TO_PO: 'Đã tạo PO',
    BOOKED: 'Đã booking',
    CREATED: 'Đã tạo',
    COPY: 'Copy',
    CUSTOMS_PROCESSING: 'Đang hải quan',
    DRAFT: 'Nháp',
    DELAYED: 'Bị trễ',
    DELIVERED: 'Đã giao',
    DONE: 'Hoàn tất',
    FAILED: 'Thất bại',
    FINAL_BL_CONFIRMED: 'Final B/L đã xác nhận',
    GREEN_CLEARANCE: 'Luồng xanh',
    IN_PROGRESS: 'Đang xử lý',
    IN_PRODUCTION: 'Đang sản xuất',
    IN_TRANSIT: 'Đang vận chuyển',
    INSPECTION: 'Kiểm hóa',
    ISSUED: 'Đã phát hành',
    MISMATCH: 'Không khớp',
    NEW: 'Mới',
    NEEDS_DOCUMENTS: 'Thiếu chứng từ',
    OFFICIAL_SENT: 'Đã gửi chính thức',
    ON_TRACK: 'Đúng hạn',
    ORIGINAL: 'Original',
    OVERDUE: 'Quá hạn',
    PARTIALLY_DELIVERED: 'Giao một phần',
    PENDING: 'Đang chờ',
    PENDING_APPROVAL: 'Chờ duyệt',
    PENDING_CONFIG: 'Chờ cấu hình',
    PRELIMINARY_SENT: 'Đã gửi sơ bộ',
    RED_FIELD_INSPECTION: 'Luồng đỏ - kiểm hóa',
    RED_VIOLATION_HANDLING: 'Luồng đỏ - xử lý vi phạm',
    REJECTED: 'Từ chối',
    READY_FOR_CHECK: 'Sẵn sàng đối chiếu',
    READY: 'Sẵn sàng',
    RELEASE_READY: 'Sẵn sàng giao hàng',
    REQUESTED: 'Đã yêu cầu',
    REVISION_REQUESTED: 'Yêu cầu chỉnh sửa',
    SAP_PENDING: 'Chờ SAP',
    SAP_SYNCED: 'SAP đã đồng bộ',
    SEAWAY_BILL: 'Seaway Bill',
    SENT_TO_ACC: 'Đã gửi kế toán',
    SETTLED: 'Đã tất toán',
    SUBMITTED: 'Đã nộp',
    SURRENDERED: 'Surrendered',
    SYNCED: 'Đã đồng bộ',
    SYNC_FAILED: 'Đồng bộ lỗi',
    SYNC_INCOMPLETE: 'Đồng bộ chưa đủ',
    TODO: 'Cần làm',
    VIOLATION_HANDLING: 'Xử lý vi phạm',
    WAITING: 'Đang chờ',
    WAITING_DOCUMENTS: 'Chờ chứng từ',
    WAREHOUSE_PENDING: 'Chờ kho',
    YELLOW_NEED_SUPPLEMENT: 'Luồng vàng - bổ sung hồ sơ',
    DRAFT_BL_CONFIRMED: 'Draft B/L đã khớp',
    CLEARED: 'Đã thông quan',
  },
};

export const documentLabels: Record<WorkspaceLanguage, Record<string, string>> = {
  en: {
    'B/L': 'B/L',
    CO: 'CO',
    Invoice: 'Invoice',
    'Packing List': 'Packing List',
  },
  vi: {
    'B/L': 'B/L',
    CO: 'CO',
    Invoice: 'Hóa đơn',
    'Packing List': 'Packing list',
  },
};

export const searchKindLabels: Record<WorkspaceLanguage, Record<SearchKind, string>> = {
  en: {
    account: 'Account',
    delivery_order: 'DO',
    purchase_order: 'PO',
    purchase_request: 'PR',
    task: 'Task',
  },
  vi: {
    account: 'Tài khoản',
    delivery_order: 'DO',
    purchase_order: 'PO',
    purchase_request: 'PR',
    task: 'Công việc',
  },
};

export const flowTagLabels: Record<WorkspaceLanguage, Record<BusinessFlowTag, string>> = {
  en: {
    BULK_PURCHASE: 'Bulk purchase',
    CONTAINER_CONSOLIDATION: 'Container consolidation',
    LINEAR: '1-1-1',
    PARTIAL_DELIVERY: 'Partial delivery',
    SPLIT_PURCHASE: 'Split purchase',
  },
  vi: {
    BULK_PURCHASE: 'Gom mua',
    CONTAINER_CONSOLIDATION: 'Gom container',
    LINEAR: '1-1-1',
    PARTIAL_DELIVERY: 'Giao từng phần',
    SPLIT_PURCHASE: 'Tách mua',
  },
};

