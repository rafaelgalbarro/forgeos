/** Program 9000 — Market signal aggregation stub. */

import { buildMarketSignals, getStrongestSignal } from "@/lib/network/signal-engine";
import type { MarketSignal, NetworkContext } from "@/lib/network/types";

export { getStrongestSignal };

export function buildAggregatedMarketSignals(ctx: NetworkContext): MarketSignal[] {
  return buildMarketSignals(ctx);
}

export function summarizeMarketSignals(signals: MarketSignal[]): string {
  const strongest = getStrongestSignal(signals);
  if (!strongest) return "Sin señales activas en la red.";
  return `${strongest.title}: confianza ${Math.round(strongest.confidence * 100)}%`;
}
