import { NextResponse } from "next/server";
import { getStrategyLabSnapshot } from "@/lib/investment/strategy-lab-snapshot";
import { getStrategyLabVersionStore } from "@/src/core/investment/strategy-lab";
import { computeStrategyLabMetrics, demoTradeSamplesForStrategy } from "@/src/core/investment/strategy-lab";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET Strategy Lab snapshot (ANALYSIS_ONLY).
 * POST { action: "version", strategyId, changeSummary } — append lab version (never production).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const focusStrategyId = url.searchParams.get("focus") ?? undefined;
  const compareWithStrategyId = url.searchParams.get("compare") ?? undefined;
  const snapshot = await getStrategyLabSnapshot({
    focusStrategyId,
    compareWithStrategyId,
    persistMemory: url.searchParams.get("persist") !== "0",
  });
  return NextResponse.json(snapshot);
}

export async function POST(request: Request) {
  let body: {
    action?: string;
    strategyId?: string;
    changeSummary?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action !== "version" || !body.strategyId || !body.changeSummary) {
    return NextResponse.json(
      {
        ok: false,
        error: "Expected { action: 'version', strategyId, changeSummary }",
        liveTradingEnabled: false,
        productionMutation: "forbidden",
      },
      { status: 400 },
    );
  }

  const metrics = computeStrategyLabMetrics(demoTradeSamplesForStrategy(body.strategyId));
  const entry = getStrategyLabVersionStore().commit({
    strategyId: body.strategyId,
    changeSummary: body.changeSummary,
    metrics,
  });

  const snapshot = await getStrategyLabSnapshot({
    focusStrategyId: body.strategyId,
    persistMemory: true,
  });

  return NextResponse.json({
    ok: true,
    entry,
    snapshot,
    liveTradingEnabled: false,
    productionMutation: "forbidden",
    goLive: "NOT_READY_FOR_LIVE",
  });
}
