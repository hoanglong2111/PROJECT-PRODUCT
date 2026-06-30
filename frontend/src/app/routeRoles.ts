import type { AppRole } from '@shared/auth/types';

const managerRoles: AppRole[] = ['ADMIN', 'PIC_MANAGER'];
const salesRoles: AppRole[] = [...managerRoles, 'SALE_STAFF'];
const operationsRoles: AppRole[] = [...managerRoles, 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'WAREHOUSE_STAFF'];
export const purchaseOrderRoles: AppRole[] = [...salesRoles, 'FINANCE_OFFICER'];
// Quotation is a commercial/pre-PO step — same audience as PO (sales + finance).
export const quotationRoles: AppRole[] = [...salesRoles, 'FINANCE_OFFICER'];
export const deliveryOrderRoles: AppRole[] = operationsRoles; // Ships renamed DO
export const masterDataRoles: AppRole[] = managerRoles;
export const shipmentRoles: AppRole[] = [...operationsRoles, 'FINANCE_OFFICER'];
export const domesticTransportOrderRoles: AppRole[] = [...operationsRoles, 'FINANCE_OFFICER'];
export const taskRoles: AppRole[] = [...operationsRoles, 'FINANCE_OFFICER'];
