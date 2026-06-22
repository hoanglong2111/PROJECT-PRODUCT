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
  avatarUrl: string | null;
  defaultWarehouseCode: string | null;
  department: string;
  email: string;
  fullName: string;
  id: string;
  operationFocus: string | null;
  phoneNumber: string | null;
  position: string;
  preferredModulePath: string | null;
  profileNote: string | null;
  role: AppRole;
  workLocation: string | null;
  workShift: string | null;
};

export type UpdateEmailPayload = {
  currentPassword: string;
  email: string;
};

export type UpdatePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type UpdateProfilePayload = {
  avatarUrl: string | null;
  defaultWarehouseCode: string | null;
  department: string;
  fullName: string;
  operationFocus: string | null;
  phoneNumber: string | null;
  position: string;
  preferredModulePath: string | null;
  profileNote: string | null;
  workLocation: string | null;
  workShift: string | null;
};
