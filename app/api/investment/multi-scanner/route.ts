import { NextResponse } from "next/server";
import {
  getMultiScannerSnapshot,
  runMultiPhaseMarketScan,
} from "@/lib/market-data/market-scanner";
import { maybeRunScheduledPipeline } from "@/lib/market-data/daily-pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cycle = url.searchParams.get("cycle") === "1";

  try {
    if (cycle) {
      const pipe = await maybeRunScheduledPipeline().catch((err) => {
        console.warn("[MultiScanner] pipeline:", err instanceof Error ? err.message : err);
        return null;
      });
      const result = await runMultiPhaseMarketScan();
      return NextResponse.json({ ...result, pipelineSession: pipe?.ran ?? null });
    }
    const cached = getMultiScannerSnapshot();
    if (cached) return NextResponse.json(cached);
    return NextResponse.json({
      scannedAt: new Date().toISOString(),
      scanDurationMs: 0,
      universeSize: 0,
      phase1Count: 0,
      phase2Count: 0,
      phase3Count: 0,
      opportunities: [],
      phases: [],
      errors: ["No scan results yet — GET ?cycle=1 or POST to run"],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Multi-scanner failed";
    return NextResponse.json({ error: message, opportunities: [] }, { status: 503 });
  }
}

export async function POST() {
  try {
    const pipe = await maybeRunScheduledPipeline().catch(() => null);
    const result = await runMultiPhaseMarketScan();
    return NextResponse.json({ ...result, pipelineSession: pipe?.ran ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Multi-scanner cycle failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
