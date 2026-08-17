import { NextResponse } from "next/server";
import {
  buildForexDashboardSnapshot,
  runForexCycle,
  sendForexEuropeOpenReport,
  sendForexSessionCloseReport,
} from "@/lib/investment/forex/runtime";
import { readForexEnabledAtRuntime } from "@/lib/investment/forex/server-env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * FOREX module API:
 * GET  — dashboard snapshot
 * POST ?action=cycle|europe-open|session-close
 */
export async function GET() {
  const forexEnabled = readForexEnabledAtRuntime();
  try {
    const snapshot = await buildForexDashboardSnapshot();
    return NextResponse.json({
      ...snapshot,
      forexEnabled,
      config: { ...snapshot.config, enabled: forexEnabled },
      mode: forexEnabled ? "LIVE_GATED" : snapshot.mode,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "FOREX snapshot failed",
        generatedAt: new Date().toISOString(),
        mode: forexEnabled ? "LIVE_GATED" : "ANALYSIS_ONLY",
        forexEnabled,
        config: { enabled: forexEnabled },
        quotes: [],
        analyses: [],
      },
      { status: 200 },
    );
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") ?? "cycle";
  try {
    if (action === "europe-open") {
      const ok = await sendForexEuropeOpenReport();
      return NextResponse.json({ ok, action });
    }
    if (action === "session-close") {
      const ok = await sendForexSessionCloseReport();
      return NextResponse.json({ ok, action });
    }
    const body = (await request.json().catch(() => ({}))) as { transmit?: boolean };
    const result = await runForexCycle({ transmit: Boolean(body.transmit) });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "FOREX action failed", action },
      { status: 500 },
    );
  }
}
