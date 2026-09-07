import { NextResponse } from "next/server";
import { controlContinuousAnalysis } from "@/lib/investment/market-scanner";
import { createDefaultAgentEcosystem } from "@/src/core/investment/agent-ecosystem";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — Continuous analysis runtime status + agent registry size. */
export async function GET() {
  const snapshot = await Promise.resolve(controlContinuousAnalysis("status"));
  const agents = createDefaultAgentEcosystem().listDefinitions();
  return NextResponse.json({
    ...snapshot,
    agentsRegistered: agents.length,
    agentIds: agents.map((a) => a.id),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    autonomousLive: "LOCKED",
    goLive: "NOT_READY_FOR_LIVE",
    ibkrReadOnly: true,
  });
}

/** POST — start | stop | cycle (analysis loop only). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const action =
    body.action === "start" || body.action === "stop" || body.action === "cycle"
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
  });
}
