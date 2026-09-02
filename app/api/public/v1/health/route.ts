import { NextResponse } from "next/server";
import { readSafetyFlags } from "@/src/core/investment/autonomous-live/mode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/public/v1/health — unauthenticated liveness for external tools.
 * ANALYSIS_ONLY; never exposes secrets.
 */
export async function GET() {
  const flags = readSafetyFlags();
  return NextResponse.json({
    ok: true,
    service: "forgeos-investment",
    api: "public/v1",
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    tradingMode: flags.tradingMode,
    ibkrReadOnly: flags.ibkrReadOnly,
  });
}
