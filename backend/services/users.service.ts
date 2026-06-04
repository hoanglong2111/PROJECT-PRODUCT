import bcrypt from 'bcryptjs';

import { toAuthUser } from '../utils/auth';
import { APP_ROLES } from '../domain/auth';
import type { CreateUserBody } from '../domain/types';
import { createUserRecord, findUserByEmail, listAllUsers } from '../models/users';

export async function listUsers() {
  return (await listAllUsers()).map(toAuthUser);
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

  if (await findUserByEmail(email)) {
    return { status: 409, error: 'Email đã tồn tại.' } as const;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUserRecord({ avatarUrl, department, email, fullName, passwordHash, position, role });
  return { status: 201, data: toAuthUser(user) } as const;
}
