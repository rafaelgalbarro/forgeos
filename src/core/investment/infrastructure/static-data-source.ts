import type { MarketSignal, MarketSnapshot, PortfolioSnapshot } from "../domain";
import type { MarketDataSource, PortfolioDataSource, SourceMetadataProvider } from "./ports";

export interface StaticInvestmentDataSource
  extends MarketDataSource,
    PortfolioDataSource,
    SourceMetadataProvider {}

export function createStaticInvestmentDataSource(params: {
  readonly marketSnapshot: MarketSnapshot;
  readonly portfolioSnapshot: PortfolioSnapshot;
  readonly signals: readonly MarketSignal[];
}): StaticInvestmentDataSource {
  const { marketSnapshot, portfolioSnapshot, signals } = params;
  return {
    async getMarketSnapshot() {
      return marketSnapshot;
    },
    async getPortfolioSnapshot() {
      return portfolioSnapshot;
    },
    async getMarketSignals() {
      return signals;
    },
    async getUsedSources() {
      return Array.from(
        new Set([
          ...marketSnapshot.sources,
          ...portfolioSnapshot.sources,
          ...signals.map((signal) => signal.source),
        ]),
      );
    },
  };
}
