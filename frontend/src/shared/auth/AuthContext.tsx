import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import type { AppRole, AuthUser, UpdateEmailPayload, UpdatePasswordPayload, UpdateProfilePayload } from './types';

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (params: { email: string; password: string }) => Promise<AuthUser>;
  logout: () => void;
  updateEmail: (params: UpdateEmailPayload) => Promise<AuthUser>;
  updatePassword: (params: UpdatePasswordPayload) => Promise<void>;
  updateProfile: (params: UpdateProfilePayload) => Promise<AuthUser>;
  user: AuthUser | null;
  hasAnyRole: (roles: AppRole[]) => boolean;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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

function readStoredUser() {
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

function persistUser(user: AuthUser | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (user) {
    window.localStorage.setItem(UI_AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    return;
  }

  window.localStorage.removeItem(UI_AUTH_USER_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    persistUser(null);
  }, []);

  const login = useCallback(async ({ email }: { email: string; password: string }) => {
    const nextUser = makeUiUser(email);
    persistUser(nextUser);
    setUser(nextUser);
    return nextUser;
  }, []);

  const updateEmail = useCallback(async (params: UpdateEmailPayload) => {
    const updatedUser = { ...(user ?? uiDefaultUser), email: params.email.trim().toLowerCase() };
    setUser(updatedUser);
    persistUser(updatedUser);
    return updatedUser;
  }, [user]);

  const updatePassword = useCallback(async (_params: UpdatePasswordPayload) => {
    return Promise.resolve();
  }, []);

  const updateProfile = useCallback(async (params: UpdateProfilePayload) => {
    const updatedUser = {
      ...(user ?? uiDefaultUser),
      ...params,
    };
    setUser(updatedUser);
    persistUser(updatedUser);
    return updatedUser;
  }, [user]);

  useEffect(() => {
    setUser(readStoredUser());
    setIsLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      updateEmail,
      updatePassword,
      updateProfile,
      user,
      hasAnyRole: (roles) => (user ? roles.includes(user.role) : false),
    }),
    [isLoading, login, logout, updateEmail, updatePassword, updateProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
