import { NextResponse } from "next/server";
import {
  emptyPortfolioManagementSnapshot,
  getPortfolioManagementSnapshot,
} from "@/lib/investment/portfolio-management-snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/investment/portfolio — portfolio management read-model.
 * ANALYSIS_ONLY — no order path; never flips LIVE_TRADING_ENABLED / IBKR_READ_ONLY.
 */
export async function GET() {
  try {
    const snapshot = await getPortfolioManagementSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portfolio snapshot failed";
    return NextResponse.json(
      {
        ...emptyPortfolioManagementSnapshot(`NO_DATA — ${message}`),
        error: message,
      },
      { status: 200 },
    );
  }
}
