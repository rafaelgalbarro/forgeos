import { NextResponse } from "next/server";
import { readDailyCandidates } from "@/lib/market-data/candidate-store";
import {
  maybeRunScheduledPipeline,
  runPipelineSession,
  type PipelineSession,
} from "@/lib/market-data/daily-pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const SESSIONS = new Set<PipelineSession>([
  "overnight",
  "europe_open",
  "us_premarket",
  "active",
  "close",
]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const session = url.searchParams.get("session")?.trim() ?? "";

  try {
    if (!session) {
      return NextResponse.json(readDailyCandidates());
    }
    if (session === "auto") {
      const result = await maybeRunScheduledPipeline();
      return NextResponse.json({ ran: result.ran, snapshot: result.snapshot });
    }
    if (!SESSIONS.has(session as PipelineSession)) {
      return NextResponse.json(
        { error: "session must be auto|overnight|europe_open|us_premarket|close" },
        { status: 400 },
      );
    }
    const snapshot = await runPipelineSession(session as PipelineSession);
    return NextResponse.json({ ran: session, snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Daily pipeline failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
