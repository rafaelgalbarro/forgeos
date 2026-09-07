import { NextResponse } from "next/server";
import { getPortfolioMonitorRuntime } from "@/lib/investment/portfolio-monitor-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Portfolio monitor read API — returns last snapshot first.
 * Does not block HTTP on evaluateNow(); evaluation continues in background.
 */
export async function GET() {
  try {
    const runtime = getPortfolioMonitorRuntime();
    if (!runtime.monitor.isRunning()) {
      runtime.monitor.start();
    }

    const snapshot = runtime.monitor.getSnapshot();
    const dataLabel = runtime.label;
    const dataNote = runtime.note;

    // Background refresh only — never await on the request path.
    void runtime.monitor.evaluateNow().catch(() => {
      /* keep last-good */
    });

    // Honesty: DEMO synthetic observations must not look like live MEASURED marks.
    const observation =
      snapshot.observation && dataLabel === "DEMO"
        ? remapDemoObservation(snapshot.observation)
        : snapshot.observation;

    return NextResponse.json({
      ...snapshot,
      observation,
      dataLabel,
      dataNote,
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      note: dataNote || "Continuous portfolio monitor is read-only. No order path is exposed.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portfolio monitor failed";
    return NextResponse.json(
      {
        error: message,
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        dataLabel: "NO_DATA",
        dataNote: message,
        monitorRunning: false,
        evaluationCount: 0,
        alerts: [],
        alertsByCategory: {},
      },
      { status: 200 },
    );
  }
}

function remapDemoObservation<T extends object>(observation: T): T {
  const next = { ...(observation as Record<string, unknown>) };
  for (const [key, value] of Object.entries(next)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      "status" in value &&
      (value as { status?: string }).status === "MEASURED"
    ) {
      const v = value as { status?: string; note?: string };
      next[key] = {
        ...(value as object),
        status: "ESTIMATED",
        note:
          typeof v.note === "string" && v.note
            ? `${v.note} · DEMO synthetic`
            : "DEMO synthetic — not a live IBKR mark",
      };
    }
  }
  return next as T;
}
