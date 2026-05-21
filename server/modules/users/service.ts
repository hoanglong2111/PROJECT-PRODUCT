import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

import { toAuthUser } from '../../auth';
import { APP_ROLES } from '../../../src/shared/auth/types';
import { pool } from '../../db';
import type { AppUserRow, CreateUserBody } from '../../types';

export async function listUsers() {
  const result = await pool.query<AppUserRow>(
    `
      SELECT *
      FROM app_users
      ORDER BY full_name ASC
    `,
  );

  return result.rows.map(toAuthUser);
}

export async function createUser(body: CreateUserBody) {
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const fullName = String(body.fullName ?? '').trim();
  const role = body.role;
  const position = String(body.position ?? '').trim();
  const department = String(body.department ?? '').trim();
  const avatarUrlRaw = String(body.avatarUrl ?? '').trim();
  const avatarUrl = avatarUrlRaw.length > 0 ? avatarUrlRaw : null;

  if (!email || !password || !fullName || !role || !position || !department) {
    return { status: 400, error: 'Thiếu thông tin bắt buộc để tạo account.' } as const;
  }

  if (!APP_ROLES.includes(role)) {
    return { status: 400, error: 'Role không hợp lệ.' } as const;
  }

  if (password.length < 6) {
    return { status: 400, error: 'Mật khẩu tối thiểu 6 ký tự.' } as const;
  }

  const existing = await pool.query<AppUserRow>('SELECT * FROM app_users WHERE email = $1 LIMIT 1', [email]);
  if (existing.rows[0]) {
    return { status: 409, error: 'Email đã tồn tại.' } as const;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = `usr-${randomUUID()}`;
  const result = await pool.query<AppUserRow>(
    `
      INSERT INTO app_users (id, email, password_hash, full_name, role, position, department, avatar_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [id, email, passwordHash, fullName, role, position, department, avatarUrl],
  );

  return { status: 201, data: toAuthUser(result.rows[0]) } as const;
}
