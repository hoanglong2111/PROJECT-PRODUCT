import { randomUUID } from 'node:crypto';

import { pool } from '../config/database';
import type { AppUserRow } from '../domain/types';

export async function findUserByEmail(email: string) {
  const result = await pool.query<AppUserRow>('SELECT * FROM app_users WHERE email = $1 LIMIT 1', [email]);
  return result.rows[0] ?? null;
}

export async function findUserById(userId: string | undefined) {
  const result = await pool.query<AppUserRow>('SELECT * FROM app_users WHERE id = $1 LIMIT 1', [userId]);
  return result.rows[0] ?? null;
}

export async function findOtherUserByEmail(email: string, userId: string | undefined) {
  const result = await pool.query<AppUserRow>('SELECT * FROM app_users WHERE email = $1 AND id <> $2 LIMIT 1', [
    email,
    userId,
  ]);
  return result.rows[0] ?? null;
}

export async function updateUserEmail(userId: string | undefined, email: string) {
  const result = await pool.query<AppUserRow>(
    'UPDATE app_users SET email = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [email, userId],
  );
  return result.rows[0];
}

export async function updateUserPassword(userId: string | undefined, passwordHash: string) {
  await pool.query('UPDATE app_users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, userId]);
}

export async function updateUserProfile(input: {
  avatarUrl: string | null;
  defaultWarehouseCode: string | null;
  department: string;
  fullName: string;
  operationFocus: string | null;
  phoneNumber: string | null;
  position: string;
  preferredModulePath: string | null;
  profileNote: string | null;
  userId: string | undefined;
  workLocation: string | null;
  workShift: string | null;
}) {
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
      input.fullName,
      input.department,
      input.position,
      input.avatarUrl,
      input.phoneNumber,
      input.workLocation,
      input.workShift,
      input.operationFocus,
      input.defaultWarehouseCode,
      input.preferredModulePath,
      input.profileNote,
      input.userId,
    ],
  );
  return result.rows[0];
}

export async function listAllUsers() {
  const result = await pool.query<AppUserRow>('SELECT * FROM app_users ORDER BY full_name ASC');
  return result.rows;
}

export async function createUserRecord(input: {
  avatarUrl: string | null;
  department: string;
  email: string;
  fullName: string;
  passwordHash: string;
  position: string;
  role: string;
}) {
  const result = await pool.query<AppUserRow>(
    `
      INSERT INTO app_users (id, email, password_hash, full_name, role, position, department, avatar_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [
      `usr-${randomUUID()}`,
      input.email,
      input.passwordHash,
      input.fullName,
      input.role,
      input.position,
      input.department,
      input.avatarUrl,
    ],
  );
  return result.rows[0];
}

export async function listSearchableUsers(isAdmin: boolean, currentUserId: string | undefined) {
  const result = isAdmin
    ? await pool.query<AppUserRow>('SELECT * FROM app_users ORDER BY full_name ASC')
    : await pool.query<AppUserRow>('SELECT * FROM app_users WHERE id = $1', [currentUserId]);
  return result.rows;
}
