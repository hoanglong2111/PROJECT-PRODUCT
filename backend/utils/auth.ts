import type { AuthUser } from '../domain/auth';
import type { AppUserRow, TokenPayload } from '../domain/types';

export function tenantIdFromAuth(_auth?: TokenPayload): string {
  return 'tenant-001';
}

export function toAuthUser(user: AppUserRow): AuthUser {
  return {
    avatarUrl: user.avatar_url,
    defaultWarehouseCode: user.default_warehouse_code ?? null,
    department: user.department,
    email: user.email,
    fullName: user.full_name,
    id: user.id,
    operationFocus: user.operation_focus ?? null,
    phoneNumber: user.phone_number ?? null,
    position: user.position,
    preferredModulePath: user.preferred_module_path ?? null,
    profileNote: user.profile_note ?? null,
    role: user.role,
    workLocation: user.work_location ?? null,
    workShift: user.work_shift ?? null,
  };
}
