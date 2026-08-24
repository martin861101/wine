import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { authApi, toAuthSession, type AuthSession, type RegisterInput, type User } from "./api";
import { supabase } from "./supabase";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<AuthSession>;
  register: (input: RegisterInput) => Promise<{ message: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const hydrate = async (next: Parameters<typeof toAuthSession>[0] | null) => {
      if (!next) {
        if (active) setSession(null);
        return;
      }
      try {
        const applicationSession = await toAuthSession(next);
        if (active) {
          setSession(
            applicationSession.user.approved && applicationSession.user.emailVerified
              ? applicationSession
              : null,
          );
        }
      } catch {
        if (active) setSession(null);
      }
    };

    void supabase.auth.getSession().then(async ({ data }) => {
      await hydrate(data.session);
      if (active) setIsLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      window.setTimeout(() => void hydrate(next), 0);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    void remember;
    const next = await authApi.login(email, password);
    setSession(next);
    return next;
  }, []);

  const register = useCallback((input: RegisterInput) => authApi.register(input), []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: Boolean(session),
      isLoading,
      login,
      register,
      logout,
    }),
    [session, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
