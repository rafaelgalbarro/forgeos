/** Cookie mirror of auth session — readable by Next.js middleware (Edge). */

import type { AuthSession } from "./types";
import { getFounderUsername, isFounderIdentity, SESSION_INACTIVITY_MS } from "./founder";

export const AUTH_COOKIE_NAME = "forgeos-auth-session";

type CookiePayload = {
  userId: string;
  email: string;
  expiresAt: string;
  lastActivityAt: string;
  role: AuthSession["role"];
  activeWorkspaceId: string;
  provider: AuthSession["provider"];
};

function toPayload(session: AuthSession): CookiePayload {
  return {
    userId: session.userId,
    email: session.email,
    expiresAt: session.expiresAt,
    lastActivityAt: session.lastActivityAt ?? session.expiresAt,
    role: session.role ?? "USER",
    activeWorkspaceId: session.activeWorkspaceId,
    provider: session.provider,
  };
}

function parseCookie(raw: string): CookiePayload | null {
  try {
    return JSON.parse(decodeURIComponent(raw)) as CookiePayload;
  } catch {
    try {
      return JSON.parse(raw) as CookiePayload;
    } catch {
      return null;
    }
  }
}

export function encodeAuthCookieValue(session: AuthSession): string {
  return encodeURIComponent(JSON.stringify(toPayload(session)));
}

export function isAuthCookieValid(raw: string | undefined | null): boolean {
  if (!raw) return false;
  const parsed = parseCookie(raw);
  if (!parsed?.userId || !parsed.expiresAt) return false;

  const now = Date.now();
  if (new Date(parsed.expiresAt).getTime() < now) return false;

  const lastActivity = parsed.lastActivityAt
    ? new Date(parsed.lastActivityAt).getTime()
    : new Date(parsed.expiresAt).getTime();
  if (Number.isFinite(lastActivity) && now - lastActivity > SESSION_INACTIVITY_MS) {
    return false;
  }

  // Private platform: only Founder session is accepted at the edge.
  if (parsed.role === "FOUNDER") return true;
  if (parsed.email && isFounderIdentity(parsed.email)) return true;

  // Reject non-founder cookies even if otherwise valid.
  void getFounderUsername();
  return false;
}

/** Client-only: mirror session into a cookie middleware can read. */
export function syncAuthCookie(session: AuthSession): void {
  if (typeof document === "undefined") return;
  const maxAge = Math.max(
    0,
    Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000),
  );
  if (maxAge <= 0) {
    clearAuthCookie();
    return;
  }
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeAuthCookieValue(session)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function clearAuthCookie(): void {
  if (typeof document === "undefined") return;
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
