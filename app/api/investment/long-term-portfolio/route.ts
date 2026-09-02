import { NextResponse } from "next/server";
import {
  emptyLongTermPortfolioSnapshot,
  getLongTermPortfolioSnapshot,
} from "@/lib/investment/long-term-portfolio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/investment/long-term-portfolio
 * Cartera Largo Plazo — value screener, dividend growth, soft rebalance, catalysts.
 * ANALYSIS_ONLY — no order path.
 */
export async function GET() {
  try {
    const snapshot = await getLongTermPortfolioSnapshot({ emitAlerts: true });
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Long-term portfolio failed";
    return NextResponse.json(
      {
        ...emptyLongTermPortfolioSnapshot(`NO_DATA — ${message}`),
        error: message,
      },
      { status: 200 },
    );
  }
}
