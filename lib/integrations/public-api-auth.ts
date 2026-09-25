import "server-only";

import { NextRequest, NextResponse } from "next/server";

/**
 * Public ForgeOS API auth — require FORGEOS_PUBLIC_API_KEY via
 * Authorization: Bearer <key> or X-ForgeOS-API-Key.
 * Health may skip this gate; opportunities/status must not.
 */
export function getPublicApiKey(): string | undefined {
  const key = process.env.FORGEOS_PUBLIC_API_KEY?.trim();
  return key || undefined;
}

export function extractPublicApiKey(req: NextRequest): string | undefined {
  const headerKey = req.headers.get("x-forgeos-api-key")?.trim();
  if (headerKey) return headerKey;
  const auth = req.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || undefined;
  }
  const queryKey = req.nextUrl.searchParams.get("api_key")?.trim();
  return queryKey || undefined;
}

export function assertPublicApiKey(req: NextRequest): NextResponse | null {
  const expected = getPublicApiKey();
  if (!expected) {
    return NextResponse.json(
      {
        error: "Public API disabled — set FORGEOS_PUBLIC_API_KEY",
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        liveTradingEnabled: false,
      },
      { status: 503 },
    );
  }
  const provided = extractPublicApiKey(req);
  if (!provided || provided !== expected) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        liveTradingEnabled: false,
      },
      { status: 401 },
    );
  }
  return null;
}
