import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, isAuthCookieValid } from "@/lib/auth/session-cookie";

/**
 * Private Founder platform — protect the entire ForgeOS app.
 * Public: /login, /forgot-password, /reset-password, /api/health (+ auth reset APIs).
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

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
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

  // APIs: 401 JSON instead of HTML redirect
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Plataforma privada — inicia sesión." },
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
