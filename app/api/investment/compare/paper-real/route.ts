import { NextResponse } from "next/server";
import { getPaperRealComparison } from "@/lib/investment/paper-real-comparison";
import { getPaperShadowComparison } from "@/lib/investment/paper-shadow-comparison";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/investment/compare/paper-real
 * Paper ledger vs IBKR real read-only (+ optional paper-shadow include).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const includeShadow = url.searchParams.get("shadow") === "1";

  try {
    const paperReal = await getPaperRealComparison();
    if (!includeShadow) {
      return NextResponse.json(paperReal);
    }
    const paperShadow = await getPaperShadowComparison();
    return NextResponse.json({
      ...paperReal,
      paperShadow,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "compare failed";
    return NextResponse.json(
      {
        error: message,
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        liveTradingEnabled: false,
        note: "NO_DATA",
      },
      { status: 503 },
    );
  }
}
