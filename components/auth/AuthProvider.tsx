"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthSession } from "@/lib/auth/types";
import { getSession, logout as authLogout } from "@/lib/auth/auth-service";
import { getActiveWorkspaceContext, type ActiveWorkspaceContext } from "@/lib/workspace";

interface AuthContextValue {
  session: AuthSession | null;
  workspace: ActiveWorkspaceContext | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [workspace, setWorkspace] = useState<ActiveWorkspaceContext | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const s = await getSession();
    setSession(s);
    setWorkspace(s ? getActiveWorkspaceContext() : null);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const logout = useCallback(async () => {
    await authLogout();
    setSession(null);
    setWorkspace(null);
  }, []);

  const value = useMemo(
    () => ({ session, workspace, loading, refresh, logout }),
    [session, workspace, loading, refresh, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useAuthOptional() {
  return useContext(AuthContext);
}
