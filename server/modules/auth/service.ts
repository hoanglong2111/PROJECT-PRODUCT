import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { toAuthUser } from '../../auth';
import { JWT_SECRET } from '../../constants';
import { pool } from '../../db';
import type { AppUserRow, TokenPayload } from '../../types';

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

export async function updateProfile(userId: string | undefined, body: Record<string, unknown>) {
  const fullName = String(body.fullName ?? '').trim();
  const department = String(body.department ?? '').trim();
  const avatarUrlRaw = String(body.avatarUrl ?? '').trim();
  const avatarUrl = avatarUrlRaw.length > 0 ? avatarUrlRaw : null;

  if (!fullName || !department) {
    return { status: 400, error: 'fullName và department là bắt buộc.' } as const;
  }

  const result = await pool.query<AppUserRow>(
    `
      UPDATE app_users
      SET full_name = $1, department = $2, avatar_url = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `,
    [fullName, department, avatarUrl, userId],
  );
  const updated = result.rows[0];

  if (!updated) {
    return { status: 404, error: 'Không tìm thấy tài khoản để cập nhật.' } as const;
  }

  return { status: 200, data: toAuthUser(updated) } as const;
}
