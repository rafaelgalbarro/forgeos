/** Program 3000 — Client session persistence. */

import type { AuthSession } from "./types";

const SESSION_KEY = "forgeos-auth-session";

let memorySession: AuthSession | null = null;

export function readSession(): AuthSession | null {
  if (typeof window === "undefined") return memorySession;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (new Date(parsed.expiresAt).getTime() < Date.now()) {
      clearSession();
      return null;
    }
    memorySession = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: AuthSession): void {
  memorySession = session;
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

export function clearSession(): void {
  memorySession = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function updateSession(patch: Partial<AuthSession>): AuthSession | null {
  const current = readSession();
  if (!current) return null;
  const next = { ...current, ...patch };
  writeSession(next);
  return next;
}
