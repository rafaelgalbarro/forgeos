import type { BrokerEngineName } from "@/src/core/application/ports/broker-engine";

export type TradingMode = "paper" | "live" | "ANALYSIS_ONLY" | "AUTONOMOUS_LIVE";

/**
 * Resolve trading mode for broker selection.
 * AUTONOMOUS_LIVE / ANALYSIS_ONLY never imply live broker writes.
 */
export function getTradingMode(): TradingMode {
  const value = (process.env.TRADING_MODE ?? "ANALYSIS_ONLY").trim();
  const upper = value.toUpperCase();
  if (upper === "AUTONOMOUS_LIVE") return "AUTONOMOUS_LIVE";
  if (upper === "ANALYSIS_ONLY") return "ANALYSIS_ONLY";
  if (value.toLowerCase() === "live") return "live";
  return "paper";
}

export function isLiveTradingExplicitlyEnabled(): boolean {
  return process.env.LIVE_TRADING_ENABLED === "true";
}

export function resolveBrokerEngineFromMode(requestedEngine: BrokerEngineName): BrokerEngineName {
  const mode = getTradingMode();
  if (mode === "paper" || mode === "ANALYSIS_ONLY" || mode === "AUTONOMOUS_LIVE") {
    // AUTONOMOUS_LIVE stays locked: do not force IBKR write path from mode alone.
    if (mode === "paper" || mode === "ANALYSIS_ONLY") return "paper";
    // AUTONOMOUS_LIVE may use IBKR for reads when requested, but only if caller chose ibkr;
    // never unlock write flags here.
    return requestedEngine === "ibkr" ? "ibkr" : "paper";
  }

  if (!isLiveTradingExplicitlyEnabled()) {
    throw new Error(
      "TRADING_MODE=live requested but LIVE_TRADING_ENABLED is not true. Live trading remains disabled.",
    );
  }

  return requestedEngine;
}
