import { NextResponse } from "next/server";
import { getOpportunityCenterSnapshot } from "@/lib/investment/opportunity-center-snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot = await getOpportunityCenterSnapshot();
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
