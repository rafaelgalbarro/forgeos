import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, isAuthCookieValid } from "@/lib/auth/session-cookie";

/**
 * Private Founder platform — protect the entire ForgeOS app.
 * Public UI: /login, /forgot-password, /reset-password, /api/health (+ auth reset APIs).
 *
 * Internal PM2 / sidecar APIs: /api/* without a user session is allowed only from
 * localhost (127.0.0.1 / ::1) or with a valid IBKR_INTERNAL_API_KEY
 * (header X-Internal-API-Key or Authorization: Bearer …).
 *
 * Known PM2 targets (non-exhaustive):
 *   /api/investment/reports
 *   /api/investment/daily-pipeline
 *   /api/investment/multi-scanner
 *   /api/investment/alerts
 *   /api/investment/forex
 *   /api/investment/header-quotes
 *   /api/trading/cycle
 */

const PUBLIC_EXACT = new Set([
  "/login",
  "/forgot-password",
  "/reset-password",
  "/api/health",
  "/register",
]);

const PUBLIC_PREFIXES = [
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

/** Explicit PM2 sidecar API prefixes (bypass still requires localhost or internal key). */
export const INTERNAL_API_PREFIXES = [
  "/api/investment/reports",
  "/api/investment/daily-pipeline",
  "/api/investment/multi-scanner",
  "/api/investment/alerts",
  "/api/investment/forex",
  "/api/investment/header-quotes",
  "/api/investment/approve",
  "/api/telegram/webhook",
  "/api/trading/cycle",
] as const;

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isListedInternalApi(pathname: string): boolean {
  return INTERNAL_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function hostnameIsLoopback(hostname: string): boolean {
  const h = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

/** True when the request Host targets the local Next process (PM2 sidecars). */
export function isLocalhostRequest(request: NextRequest): boolean {
  if (hostnameIsLoopback(request.nextUrl.hostname)) return true;
  const hostHeader = request.headers.get("host") ?? "";
  const hostName = hostHeader.split(":")[0] ?? "";
  return hostnameIsLoopback(hostName);
}

function providedInternalApiKey(request: NextRequest): string {
  const headerKey = request.headers.get("x-internal-api-key")?.trim() ?? "";
  if (headerKey) return headerKey;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  const bearer = /^Bearer\s+(.+)$/i.exec(auth);
  return bearer?.[1]?.trim() ?? "";
}

export function hasValidInternalApiKey(request: NextRequest): boolean {
  const expected =
    process.env.IBKR_INTERNAL_API_KEY?.trim() || process.env.INTERNAL_API_KEY?.trim() || "";
  if (!expected) return false;
  const provided = providedInternalApiKey(request);
  return provided.length > 0 && provided === expected;
}

/**
 * Allow unauthenticated /api/* for local sidecars or callers with the internal key.
 * INTERNAL_API_PREFIXES documents the primary PM2 routes covered by this gate.
 */
export function isInternalApiBypass(request: NextRequest, pathname: string): boolean {
  if (!pathname.startsWith("/api/")) return false;
  return isLocalhostRequest(request) || hasValidInternalApiKey(request);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Hard-disable public registration
  if (pathname === "/register" || pathname.startsWith("/register/")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("notice", "private");
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const raw = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (isAuthCookieValid(raw)) {
    return NextResponse.next();
  }

  if (isInternalApiBypass(request, pathname)) {
    return NextResponse.next();
  }

  // APIs: 401 JSON instead of HTML redirect
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message:
          "Plataforma privada — inicia sesión, llama desde localhost, o envía X-Internal-API-Key.",
      },
      { status: 401 },
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  const redirectTarget = `${pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set("redirect", redirectTarget || "/");
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next internals and common static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
