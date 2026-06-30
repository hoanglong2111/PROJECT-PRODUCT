import type { AuthUser } from '@shared/auth/types';

const UI_AUTH_USER_STORAGE_KEY = 'kbfe.ui.auth.user';

const uiDefaultUser: AuthUser = {
  avatarUrl: null,
  defaultWarehouseCode: null,
  department: 'Purchasing',
  email: 'manager@kbfe.local',
  fullName: 'KBFE Manager',
  id: 'ui-manager',
  operationFocus: null,
  phoneNumber: null,
  position: 'PIC Manager',
  preferredModulePath: '/dashboard',
  profileNote: null,
  role: 'PIC_MANAGER',
  workLocation: null,
  workShift: null,
};

function makeUiUser(email: string): AuthUser {
  const normalizedEmail = email.trim().toLowerCase() || uiDefaultUser.email;
  const isAdmin = normalizedEmail.includes('admin');

  return {
    ...uiDefaultUser,
    department: isAdmin ? 'IT Operations' : uiDefaultUser.department,
    email: normalizedEmail,
    fullName: isAdmin ? 'KBFE Admin' : uiDefaultUser.fullName,
    id: isAdmin ? 'ui-admin' : uiDefaultUser.id,
    position: isAdmin ? 'Admin' : uiDefaultUser.position,
    preferredModulePath: '/dashboard',
    role: isAdmin ? 'ADMIN' : 'PIC_MANAGER',
  };
}

export function readStoredAuthUser() {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.localStorage.getItem(UI_AUTH_USER_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as AuthUser;
  } catch {
    window.localStorage.removeItem(UI_AUTH_USER_STORAGE_KEY);
    return null;
  }
}

export function persistAuthUser(user: AuthUser | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (user) {
    window.localStorage.setItem(UI_AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    return;
  }

  window.localStorage.removeItem(UI_AUTH_USER_STORAGE_KEY);
}

export async function fetchCurrentUser(params?: { email?: string }) {
  if (params?.email) {
    return makeUiUser(params.email);
  }

  return readStoredAuthUser();
}

export function getUiDefaultUser() {
  return uiDefaultUser;
}
