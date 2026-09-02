import "server-only";

import { MarketIntelligenceEngine } from "@/src/core/investment/market-intelligence/application/market-intelligence-engine";
import { createProviderRegistryFromEnv } from "@/src/core/investment/market-intelligence/infrastructure/provider-registry";
import type { MarketIntelligenceResult } from "@/src/core/investment/market-intelligence/domain/types";

export type ScreenerGatherSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly tradeGate: "NO_TRADE_ON_DELAYED_OR_STALE";
  readonly symbols: readonly string[];
  readonly providersConfigured: number;
  readonly empty: boolean;
  readonly note: string;
  readonly result: MarketIntelligenceResult | null;
};

const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "SPY"] as const;

/**
 * Gather market intelligence for screener symbols using only env-configured providers.
 * Empty registry → graceful empty (no invented quotes).
 */
export async function gatherScreener(
  symbolsInput?: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<ScreenerGatherSnapshot> {
  const symbols = (symbolsInput?.length ? symbolsInput : DEFAULT_SYMBOLS)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 12);

  const registry = createProviderRegistryFromEnv(env);
  const providersConfigured =
    registry.marketProviders.length +
    registry.newsProviders.length +
    registry.economicProviders.length +
    registry.sentimentProviders.length;

  if (providersConfigured === 0) {
    return {
      generatedAt: new Date().toISOString(),
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      tradeGate: "NO_TRADE_ON_DELAYED_OR_STALE",
      symbols,
      providersConfigured: 0,
      empty: true,
      note: "No Market Intelligence providers configured — set env API keys/flags. NO_DATA (not DEMO fabrications).",
      result: null,
    };
  }

  const engine = new MarketIntelligenceEngine({
    marketProviders: registry.marketProviders,
    newsProviders: registry.newsProviders,
    economicProviders: registry.economicProviders,
    sentimentProviders: registry.sentimentProviders,
  });

  const result = await engine.gather({
    symbols,
    limitNewsItems: 8,
  });

  return {
    generatedAt: result.generatedAt,
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    tradeGate: "NO_TRADE_ON_DELAYED_OR_STALE",
    symbols,
    providersConfigured,
    empty: false,
    note: `Gathered via ${result.providersUsed.length} provider(s). ANALYSIS_ONLY · no orders.`,
    result,
  };
}
