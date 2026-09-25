import "server-only";

import {
  getContinuousAnalysisRuntime,
  type ContinuousAnalysisRuntimeSnapshot,
  type ContinuousMiBlend,
  type ContinuousMiGatherFn,
} from "@/src/core/investment/continuous-analysis";
import { createDefaultAgentEcosystem } from "@/src/core/investment/agent-ecosystem";
import { gatherScreener } from "@/lib/investment/screener-gather";

/** Blend MI gather into continuous analysis when providers are configured. */
export const defaultContinuousMiGather: ContinuousMiGatherFn = async (symbols) => {
  const snap = await gatherScreener(symbols);
  if (snap.empty || !snap.result) return null;

  const bySymbol: Record<
    string,
    {
      price?: number;
      changePct?: number;
      volume?: number;
      newsSentiment?: number;
    }
  > = {};
  for (const row of snap.result.marketSnapshots ?? []) {
    const symbol = String(row.symbol ?? "").toUpperCase();
    if (!symbol) continue;
    const price = typeof row.quote?.price === "number" ? row.quote.price : undefined;
    const points = row.timeSeries?.points;
    let changePct: number | undefined;
    if (points && points.length >= 2) {
      const prev = points[points.length - 2]?.close;
      const last = points[points.length - 1]?.close;
      if (typeof prev === "number" && prev > 0 && typeof last === "number") {
        changePct = ((last - prev) / prev) * 100;
      }
    }
    const volume =
      points && points.length > 0 && typeof points[points.length - 1]?.volume === "number"
        ? points[points.length - 1]!.volume
        : undefined;
    bySymbol[symbol] = { ...bySymbol[symbol], price, changePct, volume };
  }

  for (const sig of snap.result.sentiment ?? []) {
    const key = String(sig.target ?? "").toUpperCase();
    if (!key) continue;
    bySymbol[key] = {
      ...bySymbol[key],
      newsSentiment: typeof sig.score === "number" ? Math.max(-1, Math.min(1, sig.score)) : undefined,
    };
  }

  const news = snap.result.news ?? [];
  if (news.length > 0) {
    for (const symbol of symbols) {
      const key = symbol.toUpperCase();
      if (bySymbol[key]?.newsSentiment != null) continue;
      const related = news.filter(
        (n) =>
          (n.symbols ?? []).some((s) => s.toUpperCase() === key) ||
          n.title.toUpperCase().includes(key),
      ).length;
      if (related > 0) {
        bySymbol[key] = {
          ...bySymbol[key],
          newsSentiment: Math.min(0.4, related * 0.08),
        };
      }
    }
  }

  return {
    providersUsed: snap.result.providersUsed ?? [],
    bySymbol,
  };
};

export type MarketScannerSnapshot = {
  readonly generatedAt: string;
  readonly runtime: ContinuousAnalysisRuntimeSnapshot;
  readonly agentsRegistered: number;
  readonly accepted: NonNullable<ContinuousAnalysisRuntimeSnapshot["lastResult"]>["accepted"];
  readonly discarded: NonNullable<ContinuousAnalysisRuntimeSnapshot["lastResult"]>["discarded"];
  readonly miDataQuality: string;
  readonly miProvidersUsed: readonly string[];
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly autonomousLive: "LOCKED";
  readonly goLive: "NOT_READY_FOR_LIVE";
  readonly ibkrReadOnly: true;
  readonly note: string;
};

function ensureRuntime() {
  return getContinuousAnalysisRuntime({
    miGather: defaultContinuousMiGather,
  });
}

export async function getMarketScannerSnapshot(options?: {
  ensureCycle?: boolean;
}): Promise<MarketScannerSnapshot> {
  const runtime = ensureRuntime();
  if (options?.ensureCycle || !runtime.getSnapshot().lastResult) {
    await runtime.runCycle();
  }
  const snap = runtime.getSnapshot();
  const agentsRegistered = createDefaultAgentEcosystem().size();
  return {
    generatedAt: new Date().toISOString(),
    runtime: snap,
    agentsRegistered,
    accepted: snap.lastResult?.accepted ?? [],
    discarded: snap.lastResult?.discarded ?? [],
    miDataQuality: snap.lastResult?.miDataQuality ?? "stub-signals",
    miProvidersUsed: snap.lastResult?.miProvidersUsed ?? [],
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    autonomousLive: "LOCKED",
    goLive: "NOT_READY_FOR_LIVE",
    ibkrReadOnly: true,
    note: "Market Scanner — continuous analysis outputs. Paper/shadow signals only; live locked.",
  };
}

export function controlContinuousAnalysis(
  action: "start" | "stop" | "status" | "cycle",
): ContinuousAnalysisRuntimeSnapshot | Promise<ContinuousAnalysisRuntimeSnapshot> {
  const runtime = ensureRuntime();
  if (action === "start") return runtime.start();
  if (action === "stop") return runtime.stop();
  if (action === "cycle") {
    return runtime.runCycle().then(() => runtime.getSnapshot());
  }
  return runtime.getSnapshot();
}
