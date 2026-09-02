import { NextRequest, NextResponse } from "next/server";
import { getPnlAggregates, listTrades } from "@/lib/db/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/investment/history
 * Full trade history + daily/weekly/monthly P&L from SQLite.
 */
export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(
      2000,
      Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 200) || 200),
    );
    const trades = listTrades(limit);
    const aggregates = getPnlAggregates();
    return NextResponse.json({
      ok: true,
      trades,
      daily: aggregates.daily,
      weeklyPnl: aggregates.weeklyPnl,
      monthlyPnl: aggregates.monthlyPnl,
      source: "sqlite",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "history failed",
      },
      { status: 500 },
    );
  }
}
