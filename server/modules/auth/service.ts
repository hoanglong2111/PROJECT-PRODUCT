import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import type { AppRole } from '../../../src/shared/auth/types';
import { toAuthUser } from '../../auth';
import { JWT_SECRET } from '../../constants';
import { pool } from '../../db';
import type { AppUserRow, TokenPayload } from '../../types';

const preferredModuleAccess: Record<string, readonly AppRole[] | null> = {
  '/': null,
  '/workflow': null,
  '/exchange-rates': null,
  '/purchase-requests': ['ADMIN', 'PIC_MANAGER', 'SALE_STAFF'],
  '/quotations': ['ADMIN', 'PIC_MANAGER', 'SALE_STAFF'],
  '/purchase-orders': ['ADMIN', 'PIC_MANAGER', 'SALE_STAFF', 'FINANCE_OFFICER'],
  '/delivery-orders': ['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'WAREHOUSE_STAFF'],
  '/efms': ['ADMIN', 'PIC_MANAGER', 'SALE_STAFF', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'FINANCE_OFFICER', 'WAREHOUSE_STAFF'],
  '/tasks': ['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'FINANCE_OFFICER', 'WAREHOUSE_STAFF'],
};

function nullableString(value: unknown) {
  const trimmed = String(value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEmail(value: unknown) {
  const email = String(value ?? '').trim().toLowerCase();
  return /^\S+@\S+\.\S+$/.test(email) ? email : null;
}

function normalizePreferredModulePath(value: unknown, role: AppRole) {
  const preferredModulePath = nullableString(value);
  if (!preferredModulePath) {
    return { value: null } as const;
  }

  const allowedRoles = preferredModuleAccess[preferredModulePath];
  if (allowedRoles === undefined) {
    return { error: 'Module ưu tiên không hợp lệ.' } as const;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return { error: 'Tài khoản hiện tại không có quyền chọn module ưu tiên này.' } as const;
  }

  return { value: preferredModulePath } as const;
}

export async function authenticateUser(emailRaw: unknown, passwordRaw: unknown) {
  const email = String(emailRaw ?? '').trim().toLowerCase();
  const password = String(passwordRaw ?? '');

  if (!email || !password) {
    return { status: 400, error: 'Email và mật khẩu là bắt buộc.' } as const;
  }

  const result = await pool.query<AppUserRow>('SELECT * FROM app_users WHERE email = $1 LIMIT 1', [email]);
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return { status: 401, error: 'Email hoặc mật khẩu không đúng.' } as const;
  }

  const tokenPayload: TokenPayload = { sub: user.id, email: user.email, role: user.role };
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

  return { status: 200, data: { token, user: toAuthUser(user) } } as const;
}

export async function readCurrentUser(userId: string | undefined) {
  const result = await pool.query<AppUserRow>('SELECT * FROM app_users WHERE id = $1 LIMIT 1', [userId]);
  return result.rows[0] ? toAuthUser(result.rows[0]) : null;
}

export async function updateEmail(userId: string | undefined, body: Record<string, unknown>) {
  const email = normalizeEmail(body.email);
  const currentPassword = String(body.currentPassword ?? '');

  if (!email || !currentPassword) {
    return { status: 400, error: 'Email và mật khẩu hiện tại là bắt buộc.' } as const;
  }

  const currentResult = await pool.query<AppUserRow>('SELECT * FROM app_users WHERE id = $1 LIMIT 1', [userId]);
  const currentUser = currentResult.rows[0];

  if (!currentUser) {
    return { status: 404, error: 'Không tìm thấy tài khoản để cập nhật.' } as const;
  }

  if (!(await bcrypt.compare(currentPassword, currentUser.password_hash))) {
    return { status: 401, error: 'Mật khẩu hiện tại không đúng.' } as const;
  }

  const existing = await pool.query<AppUserRow>('SELECT * FROM app_users WHERE email = $1 AND id <> $2 LIMIT 1', [
    email,
    userId,
  ]);
  if (existing.rows[0]) {
    return { status: 409, error: 'Email đã tồn tại.' } as const;
  }

  const result = await pool.query<AppUserRow>(
    `
      UPDATE app_users
      SET email = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
    [email, userId],
  );

  return { status: 200, data: toAuthUser(result.rows[0]) } as const;
}

export async function updatePassword(userId: string | undefined, body: Record<string, unknown>) {
  const currentPassword = String(body.currentPassword ?? '');
  const newPassword = String(body.newPassword ?? '');

  if (!currentPassword || !newPassword) {
    return { status: 400, error: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc.' } as const;
  }

  if (newPassword.length < 6) {
    return { status: 400, error: 'Mật khẩu tối thiểu 6 ký tự.' } as const;
  }

  const currentResult = await pool.query<AppUserRow>('SELECT * FROM app_users WHERE id = $1 LIMIT 1', [userId]);
  const currentUser = currentResult.rows[0];

  if (!currentUser) {
    return { status: 404, error: 'Không tìm thấy tài khoản để cập nhật.' } as const;
  }

  if (!(await bcrypt.compare(currentPassword, currentUser.password_hash))) {
    return { status: 401, error: 'Mật khẩu hiện tại không đúng.' } as const;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE app_users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, userId]);

  return { status: 200, data: { changed: true } } as const;
}

export async function updateProfile(userId: string | undefined, body: Record<string, unknown>) {
  const currentResult = await pool.query<AppUserRow>('SELECT * FROM app_users WHERE id = $1 LIMIT 1', [userId]);
  const currentUser = currentResult.rows[0];

  if (!currentUser) {
    return { status: 404, error: 'Không tìm thấy tài khoản để cập nhật.' } as const;
  }

  const avatarUrl = nullableString(body.avatarUrl);
  const defaultWarehouseCode = nullableString(body.defaultWarehouseCode);
  const department = nullableString(body.department);
  const fullName = nullableString(body.fullName);
  const operationFocus = nullableString(body.operationFocus);
  const phoneNumber = nullableString(body.phoneNumber);
  const position = nullableString(body.position);
  const profileNote = nullableString(body.profileNote);
  const workLocation = nullableString(body.workLocation);
  const workShift = nullableString(body.workShift);
  const preferredModulePath = normalizePreferredModulePath(body.preferredModulePath, currentUser.role);

  if (!fullName || !department || !position) {
    return { status: 400, error: 'fullName, department và position là bắt buộc.' } as const;
  }

  if ('error' in preferredModulePath) {
    return { status: 400, error: preferredModulePath.error } as const;
  }

  const result = await pool.query<AppUserRow>(
    `
      UPDATE app_users
      SET full_name = $1,
          department = $2,
          position = $3,
          avatar_url = $4,
          phone_number = $5,
          work_location = $6,
          work_shift = $7,
          operation_focus = $8,
          default_warehouse_code = $9,
          preferred_module_path = $10,
          profile_note = $11,
          updated_at = NOW()
      WHERE id = $12
      RETURNING *
    `,
    [
      fullName,
      department,
      position,
      avatarUrl,
      phoneNumber,
      workLocation,
      workShift,
      operationFocus,
      defaultWarehouseCode,
      preferredModulePath.value,
      profileNote,
      userId,
    ],
  );

  return { status: 200, data: toAuthUser(result.rows[0]) } as const;
}
