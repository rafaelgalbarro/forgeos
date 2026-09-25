import { NextRequest, NextResponse } from "next/server";
import {
  getInvestmentDashboardSnapshot,
  refreshInvestmentDashboardSnapshot,
} from "@/lib/investment/dashboard-snapshot";
import { getInvestmentRuntimeFlags } from "@/lib/investment/runtime-flags";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Investment dashboard snapshot API.
 * Returns last-good snapshot immediately; refresh runs in background unless force=1.
 * Mode / LIVE_TRADING_ENABLED / orders follow .env.local via runtime flags.
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

    const flags = getInvestmentRuntimeFlags();
    return NextResponse.json({
      ...snapshot,
      mode: flags.modeLabel,
      orderExecution: flags.orderExecution,
      liveTradingEnabled: flags.liveTradingEnabled,
      ibkrReadOnly: flags.ibkrReadOnly,
      forexEnabled: flags.forexEnabled,
      tradingMode: flags.tradingMode,
      note: `Investment dashboard · LIVE_TRADING_ENABLED=${flags.liveTradingEnabled} · orders ${flags.orderExecution}`,
    });
  } catch (error) {
    const fallback = getInvestmentDashboardSnapshot();
    const flags = getInvestmentRuntimeFlags();
    return NextResponse.json(
      {
        ...fallback,
        error: error instanceof Error ? error.message : "Dashboard snapshot failed",
        mode: flags.modeLabel,
        orderExecution: flags.orderExecution,
        liveTradingEnabled: flags.liveTradingEnabled,
        ibkrReadOnly: flags.ibkrReadOnly,
        forexEnabled: flags.forexEnabled,
        tradingMode: flags.tradingMode,
      },
      { status: 200 },
    );
  }
}
