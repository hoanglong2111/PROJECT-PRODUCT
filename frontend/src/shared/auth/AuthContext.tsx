import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import {
  fetchCurrentUser,
  getUiDefaultUser,
  persistAuthUser,
} from '@shared/api/auth';
import { capabilitiesForUser } from './accessPolicy';
import type { Capability } from './capabilities';
import { isDemoHidden } from '@shared/config/featureFlags';
import type { AppRole, AuthUser, UpdateEmailPayload, UpdatePasswordPayload, UpdateProfilePayload } from './types';

type AuthContextValue = {
  capabilities: Set<Capability>;
  can: (capability: Capability) => boolean;
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

  const capabilities = useMemo(() => {
    if (!user) {
      return new Set<Capability>();
    }

    return new Set(capabilitiesForUser(user).filter((capability) => !isDemoHidden(capability)));
  }, [user]);

  const can = useCallback((capability: Capability) => capabilities.has(capability), [capabilities]);

  const value = useMemo<AuthContextValue>(
    () => ({
      capabilities,
      can,
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
    [can, capabilities, isLoading, login, logout, updateEmail, updatePassword, updateProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
