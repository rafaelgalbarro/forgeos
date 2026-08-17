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
export const maxDuration = 30;

const CYCLE_TIMEOUT_MS = 30_000;

function parseBoolParam(raw: string | null | undefined): boolean | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  const v = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return undefined;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timeout ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

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
    const body = (await request.json().catch(() => ({}))) as {
      transmit?: boolean;
      staged?: boolean;
    };
    const forexEnabled = readForexEnabledAtRuntime();
    const stagedFromQuery = parseBoolParam(url.searchParams.get("staged"));
    const staged = forexEnabled
      ? false
      : (stagedFromQuery ?? body.staged ?? true);
    const result = await withTimeout(
      runForexCycle({ staged, transmit: Boolean(body.transmit) }),
      CYCLE_TIMEOUT_MS,
      "FOREX cycle",
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "FOREX action failed";
    const timedOut = /timeout/i.test(message);
    return NextResponse.json(
      {
        error: message,
        action,
        ranAt: new Date().toISOString(),
        skipped: timedOut,
        reason: timedOut ? "FOREX cycle timeout 30s" : undefined,
        actionable: [],
        errors: [message],
      },
      { status: timedOut ? 504 : 500 },
    );
  }
}
