import type { AppRole } from '@shared/auth/types';

const managerRoles: AppRole[] = ['ADMIN', 'PIC_MANAGER'];
const salesRoles: AppRole[] = [...managerRoles, 'SALE_STAFF'];
const operationsRoles: AppRole[] = [...managerRoles, 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'WAREHOUSE_STAFF'];
export const purchaseRequestRoles: AppRole[] = salesRoles;
export const purchaseOrderRoles: AppRole[] = [...salesRoles, 'FINANCE_OFFICER'];
export const quotationRoles: AppRole[] = salesRoles;
export const deliveryOrderRoles: AppRole[] = operationsRoles;
export const efmsRoles: AppRole[] = [...salesRoles, 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'FINANCE_OFFICER', 'WAREHOUSE_STAFF'];
export const taskRoles: AppRole[] = [...operationsRoles, 'FINANCE_OFFICER'];
