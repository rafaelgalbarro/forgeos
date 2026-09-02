import type { MarketSignal, MarketSnapshot, PortfolioSnapshot } from "../domain";

/**
 * Data-source abstractions for the Investment Brain.
 * These ports are intentionally analysis-only and must not expose order APIs.
 */
export interface MarketDataSource {
  getMarketSnapshot(): Promise<MarketSnapshot>;
  getMarketSignals(): Promise<readonly MarketSignal[]>;
}

export interface PortfolioDataSource {
  getPortfolioSnapshot(): Promise<PortfolioSnapshot>;
}

export interface SourceMetadataProvider {
  getUsedSources(): Promise<readonly string[]>;
}
