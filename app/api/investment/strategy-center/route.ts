import { NextResponse } from "next/server";
import {
  getStrategyCenterSnapshot,
  setStrategyEnabled,
} from "@/lib/investment/strategy-catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — Strategy Center catalog with enable/disable state. */
export async function GET() {
  try {
    return NextResponse.json(getStrategyCenterSnapshot());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Strategy center failed";
    return NextResponse.json(
      {
        error: message,
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        strategyReadiness: "NOT_READY",
        autonomousLive: "LOCKED",
        goLive: "NOT_READY_FOR_LIVE",
        strategies: [],
        count: 0,
        enabledCount: 0,
      },
      { status: 200 },
    );
  }
}

/** POST — toggle strategy enabled flag (analysis-only; does not unlock live). */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      strategyId?: string;
      enabled?: boolean;
    };
    if (!body.strategyId || typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { error: "strategyId and enabled(boolean) required", mode: "ANALYSIS_ONLY" },
        { status: 400 },
      );
    }
    const result = setStrategyEnabled(body.strategyId, body.enabled);
    if (!result.ok) {
      return NextResponse.json({ ...result, mode: "ANALYSIS_ONLY" }, { status: 400 });
    }
    return NextResponse.json({
      ...result,
      snapshot: getStrategyCenterSnapshot(),
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      liveTradingEnabled: false,
      autonomousLive: "LOCKED",
      goLive: "NOT_READY_FOR_LIVE",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Strategy toggle failed";
    return NextResponse.json(
      { error: message, mode: "ANALYSIS_ONLY", orderExecution: "disabled" },
      { status: 200 },
    );
  }
}
