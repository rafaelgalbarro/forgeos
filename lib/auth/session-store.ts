/** Program 3000 — Client session persistence (24h inactivity timeout). */

import type { AuthSession } from "./types";
import { SESSION_INACTIVITY_MS } from "./founder";
import { clearAuthCookie, syncAuthCookie } from "./session-cookie";

const SESSION_KEY = "forgeos-auth-session";

let memorySession: AuthSession | null = null;

function isExpired(session: AuthSession, now = Date.now()): boolean {
  if (new Date(session.expiresAt).getTime() < now) return true;
  const last = session.lastActivityAt
    ? new Date(session.lastActivityAt).getTime()
    : new Date(session.expiresAt).getTime();
  return Number.isFinite(last) && now - last > SESSION_INACTIVITY_MS;
}

function withActivity(session: AuthSession, now = new Date()): AuthSession {
  const expires = new Date(now.getTime() + SESSION_INACTIVITY_MS);
  return {
    ...session,
    role: session.role ?? "FOUNDER",
    lastActivityAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
}

export function readSession(): AuthSession | null {
  if (typeof window === "undefined") return memorySession;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      clearAuthCookie();
      return null;
    }
    const parsed = JSON.parse(raw) as AuthSession;
    if (isExpired(parsed)) {
      clearSession();
      return null;
    }
    memorySession = parsed;
    syncAuthCookie(parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: AuthSession): void {
  const next = withActivity({
    ...session,
    lastActivityAt: session.lastActivityAt || new Date().toISOString(),
    role: session.role ?? "FOUNDER",
  });
  memorySession = next;
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    syncAuthCookie(next);
  }
}

/** Extend sliding expiry on user activity (navigation, focus, API use). */
export function touchSession(): AuthSession | null {
  const current = readSession();
  if (!current) return null;
  const next = withActivity(current);
  memorySession = next;
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    syncAuthCookie(next);
  }
  return next;
}

export function clearSession(): void {
  memorySession = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
    clearAuthCookie();
  }
}

export function updateSession(patch: Partial<AuthSession>): AuthSession | null {
  const current = readSession();
  if (!current) return null;
  const next = withActivity({ ...current, ...patch });
  writeSession(next);
  return next;
}
