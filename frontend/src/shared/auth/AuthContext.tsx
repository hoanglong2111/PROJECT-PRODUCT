import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import {
  fetchCurrentUser,
  getUiDefaultUser,
  persistAuthUser,
} from '@shared/api/auth';
import type { AuthUser, UpdateEmailPayload, UpdatePasswordPayload, UpdateProfilePayload } from './types';

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (params: { email: string; password: string }) => Promise<AuthUser>;
  logout: () => void;
  updateEmail: (params: UpdateEmailPayload) => Promise<AuthUser>;
  updatePassword: (params: UpdatePasswordPayload) => Promise<void>;
  updateProfile: (params: UpdateProfilePayload) => Promise<AuthUser>;
  user: AuthUser | null;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    persistAuthUser(null);
  }, []);

  const login = useCallback(async ({ email }: { email: string; password: string }) => {
    const nextUser = await fetchCurrentUser({ email });
    if (!nextUser) {
      throw new Error('Unable to resolve current user');
    }
    persistAuthUser(nextUser);
    setUser(nextUser);
    return nextUser;
  }, []);

  const updateEmail = useCallback(async (params: UpdateEmailPayload) => {
    const updatedUser = { ...(user ?? getUiDefaultUser()), email: params.email.trim().toLowerCase() };
    setUser(updatedUser);
    persistAuthUser(updatedUser);
    return updatedUser;
  }, [user]);

  const updatePassword = useCallback(async (_params: UpdatePasswordPayload) => {
    return Promise.resolve();
  }, []);

  const updateProfile = useCallback(async (params: UpdateProfilePayload) => {
    const updatedUser = {
      ...(user ?? getUiDefaultUser()),
      ...params,
    };
    setUser(updatedUser);
    persistAuthUser(updatedUser);
    return updatedUser;
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    void fetchCurrentUser().then((storedUser) => {
      if (!isMounted) {
        return;
      }

      setUser(storedUser);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
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
    }),
    [isLoading, login, logout, updateEmail, updatePassword, updateProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
