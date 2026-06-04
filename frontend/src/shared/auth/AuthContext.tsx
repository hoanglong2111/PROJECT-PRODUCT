import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import { AUTH_TOKEN_STORAGE_KEY, http, setHttpAuthToken } from '@shared/api/http';
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

type ApiResponse<T> = {
  data: T;
  errors?: unknown[];
  meta?: Record<string, unknown>;
};

type LoginPayload = {
  token: string;
  user: AuthUser;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function persistToken(token: string | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    persistToken(null);
    setHttpAuthToken(null);
  }, []);

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const response = await http.post<ApiResponse<LoginPayload>>('/auth/login', { email, password });
    const payload = response.data.data;
    persistToken(payload.token);
    setHttpAuthToken(payload.token);
    setUser(payload.user);
    return payload.user;
  }, []);

  const updateEmail = useCallback(async (params: UpdateEmailPayload) => {
    const response = await http.patch<ApiResponse<AuthUser>>('/profile/email', params);
    const updatedUser = response.data.data;
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const updatePassword = useCallback(async (params: UpdatePasswordPayload) => {
    await http.patch<ApiResponse<{ changed: boolean }>>('/profile/password', params);
  }, []);

  const updateProfile = useCallback(async (params: UpdateProfilePayload) => {
    const response = await http.patch<ApiResponse<AuthUser>>('/profile', params);
    const updatedUser = response.data.data;
    setUser(updatedUser);
    return updatedUser;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrapAuth() {
      try {
        const token =
          typeof window !== 'undefined' ? window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) : null;

        if (!token) {
          return;
        }

        setHttpAuthToken(token);
        const response = await http.get<ApiResponse<AuthUser>>('/auth/me');
        if (mounted) {
          setUser(response.data.data);
        }
      } catch {
        if (mounted) {
          logout();
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void bootstrapAuth();

    return () => {
      mounted = false;
    };
  }, [logout]);

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
