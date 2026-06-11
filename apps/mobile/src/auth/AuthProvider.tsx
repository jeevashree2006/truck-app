import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { api } from '@/api/client';
import { clearTokens, loadTokens, saveTokens } from '@/api/tokenStore';
import type { OTPRequested, User } from '@/types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  requestOtp: (email: string, name?: string) => Promise<OTPRequested>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);

  // Restore session on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      const tokens = await loadTokens();
      if (!tokens) {
        if (active) setStatus('unauthenticated');
        return;
      }
      try {
        const me = await api.me();
        if (active) {
          setUser(me);
          setStatus('authenticated');
        }
      } catch {
        // Token present but profile fetch failed — still treat as logged in so
        // the (mock-backed) app is usable; profile will refresh later.
        if (active) {
          setUser(null);
          setStatus('authenticated');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const requestOtp = useCallback(
    (email: string, name?: string) => api.requestOtp(email, name),
    []
  );

  const verifyOtp = useCallback(async (email: string, code: string) => {
    const tokens = await api.verifyOtp(email, code);
    await saveTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      setUser(null);
    }
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    await clearTokens();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, requestOtp, verifyOtp, logout }),
    [status, user, requestOtp, verifyOtp, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
