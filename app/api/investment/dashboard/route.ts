import { NextRequest, NextResponse } from "next/server";
import {
  getInvestmentDashboardSnapshot,
  refreshInvestmentDashboardSnapshot,
} from "@/lib/investment/dashboard-snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Investment dashboard snapshot API.
 * Returns last-good snapshot immediately; refresh runs in background unless force=1.
 * ANALYSIS_ONLY — no order path.
 */
export async function GET(request: NextRequest) {
  try {
    const force = request.nextUrl.searchParams.get("force") === "1";
    const wait = request.nextUrl.searchParams.get("wait") === "1";

    // Default: last-good immediately; background refresh warms cache.
    // wait=1 awaits a refresh (diagnostics only).
    const snapshot = wait
      ? await refreshInvestmentDashboardSnapshot({ force: true, preferCache: false })
      : await refreshInvestmentDashboardSnapshot({ force, preferCache: !force });

    if (!wait) {
      void refreshInvestmentDashboardSnapshot({ force: false, preferCache: false });
    }

    return NextResponse.json({
      ...snapshot,
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      liveTradingEnabled: false,
      note: "Investment dashboard snapshot — ANALYSIS_ONLY, no orders.",
    });
  } catch (error) {
    const fallback = getInvestmentDashboardSnapshot();
    return NextResponse.json(
      {
        ...fallback,
        error: error instanceof Error ? error.message : "Dashboard snapshot failed",
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
      },
      { status: 200 },
    );
  }
}
