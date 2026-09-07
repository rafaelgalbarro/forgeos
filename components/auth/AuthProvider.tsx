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
import { usePathname, useRouter } from "next/navigation";
import type { AuthSession } from "@/lib/auth/types";
import { getSession, logout as authLogout } from "@/lib/auth/auth-service";
import { readSession, touchSession } from "@/lib/auth/session-store";
import { getActiveWorkspaceContext, type ActiveWorkspaceContext } from "@/lib/workspace";

interface AuthContextValue {
  session: AuthSession | null;
  workspace: ActiveWorkspaceContext | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  isFounder: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_PATHS = new Set(["/login", "/forgot-password", "/reset-password", "/register"]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [workspace, setWorkspace] = useState<ActiveWorkspaceContext | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname() ?? "";

  const refresh = useCallback(async () => {
    const s = await getSession();
    setSession(s);
    setWorkspace(s ? getActiveWorkspaceContext() : null);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // 24h inactivity: touch only on real user activity; poll expiry separately.
  useEffect(() => {
    function redirectIfLoggedOut() {
      if (PUBLIC_PATHS.has(pathname) || pathname.startsWith("/api/")) return;
      setSession(null);
      setWorkspace(null);
      router.replace(`/login?redirect=${encodeURIComponent(pathname || "/")}`);
    }

    function onActivity() {
      const next = touchSession();
      if (next) {
        setSession(next);
        setWorkspace(getActiveWorkspaceContext());
      } else {
        redirectIfLoggedOut();
      }
    }

    function checkExpiry() {
      const s = readSession();
      if (s) {
        setSession(s);
      } else {
        redirectIfLoggedOut();
      }
    }

    // Extend session on navigation into app
    if (!PUBLIC_PATHS.has(pathname)) {
      onActivity();
    } else {
      checkExpiry();
    }

    const interval = window.setInterval(checkExpiry, 60_000);
    const opts = { passive: true } as const;
    window.addEventListener("pointerdown", onActivity, opts);
    window.addEventListener("keydown", onActivity, opts);
    window.addEventListener("focus", onActivity);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") onActivity();
    });

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("focus", onActivity);
    };
  }, [pathname, router]);

  const logout = useCallback(async () => {
    await authLogout();
    setSession(null);
    setWorkspace(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({
      session,
      workspace,
      loading,
      refresh,
      logout,
      isFounder: session?.role === "FOUNDER",
    }),
    [session, workspace, loading, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be within AuthProvider");
  return ctx;
}

export function useAuthOptional() {
  return useContext(AuthContext);
}
