import { NextResponse } from "next/server";
import { getRiskCenterSnapshot } from "@/lib/investment/risk-center-snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/investment/risk — ANALYSIS_ONLY risk center snapshot. No order path. */
export async function GET() {
  try {
    const snapshot = await getRiskCenterSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Risk center failed";
    return NextResponse.json(
      {
        error: message,
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        liveTradingEnabled: false,
        metrics: [],
        alerts: [],
        stressTest: {
          label: "SIMULATION",
          mode: "ANALYSIS_ONLY",
          orderExecution: "disabled",
          scenarios: [],
          note: "NO_DATA",
        },
        recommendations: [],
      },
      { status: 200 },
    );
  }
}
