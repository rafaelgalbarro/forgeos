import { NextResponse } from "next/server";
import { getStrategyCatalogSnapshot } from "@/lib/investment/strategy-catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — Strategy Engine catalog. Metadata only. No orders. */
export async function GET() {
  try {
    const snapshot = getStrategyCatalogSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Strategy catalog failed";
    return NextResponse.json(
      {
        error: message,
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        strategyReadiness: "NOT_READY",
        autonomousLive: "LOCKED",
        strategies: [],
        count: 0,
      },
      { status: 200 },
    );
  }
}
