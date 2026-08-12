import "server-only";

import {
  createDefaultStrategyEngine,
  getStrategyActivationStore,
  isStrategyId,
  type StrategyId,
} from "@/src/core/investment/strategy";

export type StrategyCenterRow = {
  readonly strategyId: string;
  readonly name: string;
  readonly version: string;
  readonly enabled: boolean;
  readonly regimes: string;
  readonly description: string;
  readonly compatibleMarkets: string;
  readonly compatibleAssets: string;
  readonly timeHorizon: string;
  readonly idealConditions: string;
  readonly unfavorableConditions: string;
  readonly historicalPerformanceLevel: string;
  readonly currentConfidence: number | null;
  readonly status: "ENABLED" | "DISABLED";
};

export type StrategyCenterSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly strategyReadiness: "NOT_READY";
  readonly autonomousLive: "LOCKED";
  readonly goLive: "NOT_READY_FOR_LIVE";
  readonly liveTradingEnabled: false;
  readonly strategies: readonly StrategyCenterRow[];
  readonly enabledCount: number;
  readonly count: number;
  readonly note: string;
};

/**
 * Strategy Center catalog — Strategy Engine metadata + enable/disable.
 * Never submits orders; readiness stays NOT_READY.
 */
export function getStrategyCenterSnapshot(): StrategyCenterSnapshot {
  const engine = createDefaultStrategyEngine();
  const activation = getStrategyActivationStore();
  const metadata = engine.listMetadata();
  const strategies: StrategyCenterRow[] = metadata.map((m) => {
    const enabled = activation.isEnabled(m.strategyId);
    return {
      strategyId: m.strategyId,
      name: m.name,
      version: m.version,
      enabled,
      regimes: m.compatibleRegimes.join(", ") || "NO_DATA",
      description: m.assumptions[0] ?? "NO_DATA",
      compatibleMarkets: m.compatibleMarkets?.join(", ") ?? "NO_DATA",
      compatibleAssets: m.compatibleAssets?.join(", ") ?? "NO_DATA",
      timeHorizon: m.timeHorizon ?? "NO_DATA",
      idealConditions: m.idealConditions?.join("; ") ?? "NO_DATA",
      unfavorableConditions: m.unfavorableConditions?.join("; ") ?? "NO_DATA",
      historicalPerformanceLevel: m.historicalPerformanceLevel ?? "unproven",
      currentConfidence: m.currentConfidence ?? null,
      status: enabled ? "ENABLED" : "DISABLED",
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    strategyReadiness: "NOT_READY",
    autonomousLive: "LOCKED",
    goLive: "NOT_READY_FOR_LIVE",
    liveTradingEnabled: false,
    strategies,
    enabledCount: strategies.filter((s) => s.enabled).length,
    count: strategies.length,
    note: "Strategy Center — analysis intents only. Enable/disable does not unlock live trading.",
  };
}

export function setStrategyEnabled(
  strategyId: string,
  enabled: boolean,
): { ok: true; strategyId: StrategyId; enabled: boolean } | { ok: false; error: string } {
  if (!isStrategyId(strategyId)) {
    return { ok: false, error: `Unknown strategy id: ${strategyId}` };
  }
  getStrategyActivationStore().setEnabled(strategyId, enabled);
  return { ok: true, strategyId, enabled };
}

/** Backward-compatible catalog used by Strategy Lab / API. */
export function getStrategyCatalogSnapshot() {
  const center = getStrategyCenterSnapshot();
  return {
    generatedAt: center.generatedAt,
    mode: center.mode,
    orderExecution: center.orderExecution,
    strategyReadiness: center.strategyReadiness,
    autonomousLive: center.autonomousLive,
    strategies: center.strategies.map((s) => ({
      strategyId: s.strategyId,
      name: s.name,
      version: s.version,
      regimes: s.regimes,
      description: s.description,
      status: s.status === "ENABLED" ? "REGISTERED" : "DISABLED",
    })),
    count: center.count,
    note: center.note,
  };
}
