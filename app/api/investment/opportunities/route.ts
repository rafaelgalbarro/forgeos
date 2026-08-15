import { NextRequest, NextResponse } from "next/server";
import { getOpportunityCenterSnapshot } from "@/lib/investment/opportunity-center-snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const preferCache = req.nextUrl.searchParams.get("preferCache") !== "0";
    const force = req.nextUrl.searchParams.get("force") === "1";
    const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "");
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(100, limitRaw) : 20;

    const snapshot = await getOpportunityCenterSnapshot({
      preferCache,
      force,
      limit,
    });
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Opportunity scanner failed";
    return NextResponse.json(
      {
        error: message,
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        liveTradingEnabled: false,
        opportunities: [],
        candidates: [],
        count: 0,
        badges: ["ANALYSIS_ONLY", "no-orders"],
      },
      { status: 503 },
    );
  }
}
