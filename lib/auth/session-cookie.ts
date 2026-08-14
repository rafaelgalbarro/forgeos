/** Cookie mirror of auth session — readable by Next.js middleware (Edge). */

import type { AuthSession } from "./types";

export const AUTH_COOKIE_NAME = "forgeos-auth-session";

type CookiePayload = {
  userId: string;
  email: string;
  expiresAt: string;
  activeWorkspaceId: string;
  provider: AuthSession["provider"];
};

function toPayload(session: AuthSession): CookiePayload {
  return {
    userId: session.userId,
    email: session.email,
    expiresAt: session.expiresAt,
    activeWorkspaceId: session.activeWorkspaceId,
    provider: session.provider,
  };
}

export function encodeAuthCookieValue(session: AuthSession): string {
  return encodeURIComponent(JSON.stringify(toPayload(session)));
}

export function isAuthCookieValid(raw: string | undefined | null): boolean {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<CookiePayload>;
    if (!parsed.userId || !parsed.expiresAt) return false;
    if (new Date(parsed.expiresAt).getTime() < Date.now()) return false;
    return true;
  } catch {
    try {
      const parsed = JSON.parse(raw) as Partial<CookiePayload>;
      if (!parsed.userId || !parsed.expiresAt) return false;
      if (new Date(parsed.expiresAt).getTime() < Date.now()) return false;
      return true;
    } catch {
      return false;
    }
  }
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
