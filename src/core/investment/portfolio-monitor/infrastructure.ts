import type { PortfolioAnalyticsDataProvider } from "../infrastructure/portfolio-analytics-provider";
import type { PortfolioAnalyticsInput } from "../domain/portfolio-analytics";
import type { PortfolioMonitorSnapshotStore } from "./application";
import {
  ensurePortfolioMonitorSnapshot,
  type PortfolioMonitorSnapshot,
} from "./domain";

/**
 * Read-model snapshot provider port for the continuous portfolio monitor.
 * Implementations must remain analysis-only (no order APIs, no broker SDKs).
 */
export type PortfolioMonitorSnapshotProvider = PortfolioAnalyticsDataProvider;

export class StaticPortfolioMonitorSnapshotProvider implements PortfolioMonitorSnapshotProvider {
  constructor(private readonly snapshot: PortfolioAnalyticsInput) {}

  async loadSnapshot(): Promise<PortfolioAnalyticsInput> {
    return this.snapshot;
  }
}

/** Deterministic demo portfolio for ANALYSIS_ONLY continuous monitoring. */
export class SyntheticPortfolioMonitorSnapshotProvider implements PortfolioMonitorSnapshotProvider {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async loadSnapshot(): Promise<PortfolioAnalyticsInput> {
    const asOf = this.now().toISOString();
    return {
      asOf,
      baseCurrency: "USD",
      cash: 2_500,
      riskFreeRate: 0.001,
      benchmarkReturns: [0.01, -0.015, 0.012, -0.02, 0.008, -0.01, 0.004],
      portfolioReturns: [0.015, -0.03, 0.01, -0.045, 0.006, -0.02, -0.01],
      positions: [
        {
          symbol: "AAPL",
          quantity: 40,
          averageCost: 170,
          marketPrice: 190,
          currency: "USD",
          sector: "Technology",
          industry: "Consumer Electronics",
          country: "US",
          beta: 1.2,
          returnsSeries: [0.02, -0.01, 0.015, -0.02, 0.01],
        },
        {
          symbol: "AAPL",
          quantity: 10,
          averageCost: 175,
          marketPrice: 190,
          currency: "USD",
          sector: "Technology",
          industry: "Consumer Electronics",
          country: "US",
          beta: 1.2,
          returnsSeries: [0.02, -0.01, 0.015, -0.02, 0.01],
        },
        {
          symbol: "MSFT",
          quantity: 12,
          averageCost: 300,
          marketPrice: 320,
          currency: "USD",
          sector: "Technology",
          industry: "Software",
          country: "US",
          beta: 1.05,
          returnsSeries: [0.018, -0.012, 0.01, -0.015, 0.008],
        },
        {
          symbol: "JPM",
          quantity: 8,
          averageCost: 140,
          marketPrice: 150,
          currency: "USD",
          sector: "Financials",
          industry: "Banks",
          country: "US",
          beta: 1.1,
          returnsSeries: [0.01, -0.008, 0.012, -0.01, 0.006],
        },
      ],
    };
  }
}

export class InMemoryPortfolioMonitorStore implements PortfolioMonitorSnapshotStore {
  private snapshot: PortfolioMonitorSnapshot | null = null;

  async load(): Promise<PortfolioMonitorSnapshot | null> {
    return this.snapshot;
  }

  async save(snapshot: PortfolioMonitorSnapshot): Promise<void> {
    this.snapshot = ensurePortfolioMonitorSnapshot(snapshot);
  }
}
