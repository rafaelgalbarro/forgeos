import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, isAuthCookieValid } from "@/lib/auth/session-cookie";

/**
 * Protect ForgeOS Investment UI only — /investment and all subroutes.
 * Does not gate /api/investment/* or any other ForgeOS product routes.
 */
export function middleware(request: NextRequest) {
  const raw = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (isAuthCookieValid(raw)) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  const redirectTarget = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set("redirect", redirectTarget || "/investment");
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/investment", "/investment/:path*"],
};
