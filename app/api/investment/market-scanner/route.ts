import { NextResponse } from "next/server";
import {
  controlContinuousAnalysis,
  getMarketScannerSnapshot,
} from "@/lib/investment/market-scanner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — Market Scanner snapshot (analysis-only continuous runtime). */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ensureCycle = url.searchParams.get("cycle") === "1";
    const snapshot = await getMarketScannerSnapshot({ ensureCycle });
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Market scanner failed";
    return NextResponse.json(
      {
        error: message,
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        liveTradingEnabled: false,
        autonomousLive: "LOCKED",
        goLive: "NOT_READY_FOR_LIVE",
        accepted: [],
        discarded: [],
      },
      { status: 200 },
    );
  }
}

/** POST — start | stop | cycle continuous analysis (never unlocks live). */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    const action = body.action === "start" || body.action === "stop" || body.action === "cycle"
      ? body.action
      : "status";
    const snapshot = await Promise.resolve(controlContinuousAnalysis(action));
    return NextResponse.json({
      ...snapshot,
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      liveTradingEnabled: false,
      autonomousLive: "LOCKED",
      goLive: "NOT_READY_FOR_LIVE",
      note: "Continuous analysis control — no order submission.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Continuous analysis control failed";
    return NextResponse.json(
      {
        error: message,
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        liveTradingEnabled: false,
        autonomousLive: "LOCKED",
      },
      { status: 200 },
    );
  }
}
