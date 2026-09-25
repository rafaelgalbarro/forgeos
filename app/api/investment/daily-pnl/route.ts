import { NextResponse } from "next/server";
import { getDailyPnlSummary } from "@/lib/db/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/investment/daily-pnl
 * Today's closed-trade P&L from SQLite (.forgeos/db.sqlite).
 */
export async function GET() {
  try {
    const summary = getDailyPnlSummary();
    return NextResponse.json({
      ok: true,
      ...summary,
      source: "sqlite",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "daily-pnl failed",
      },
      { status: 500 },
    );
  }
}
