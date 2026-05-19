export const APP_ROLES = [
  'ADMIN',
  'PIC_MANAGER',
  'SALE_STAFF',
  'PORT_OFFICER',
  'CUSTOMS_OFFICER',
  'FINANCE_OFFICER',
  'WAREHOUSE_STAFF',
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  position: string;
  department: string;
  role: AppRole;
  avatarUrl: string | null;
};

export const ROLE_LABEL: Record<AppRole, string> = {
  ADMIN: 'Admin',
  PIC_MANAGER: 'PIC Manager',
  SALE_STAFF: 'Sale Staff',
  PORT_OFFICER: 'Port Officer',
  CUSTOMS_OFFICER: 'Customs Officer',
  FINANCE_OFFICER: 'Finance Officer',
  WAREHOUSE_STAFF: 'Warehouse Staff',
};
