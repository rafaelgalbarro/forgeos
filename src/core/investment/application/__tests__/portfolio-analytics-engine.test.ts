import { describe, expect, it } from "vitest";
import { computePortfolioAnalytics } from "../portfolio-analytics-engine";
import { ensurePortfolioAnalyticsSnapshot } from "../../domain/portfolio-analytics";

describe("portfolio analytics engine", () => {
  it("computes core performance and risk metrics", () => {
    const snapshot = computePortfolioAnalytics({
      asOf: "2026-07-30T00:00:00.000Z",
      baseCurrency: "USD",
      cash: 5000,
      riskFreeRate: 0.001,
      benchmarkReturns: [0.01, -0.02, 0.015, 0.004, 0.012],
      portfolioReturns: [0.012, -0.018, 0.02, 0.003, 0.01],
      positions: [
        {
          symbol: "AAPL",
          quantity: 10,
          averageCost: 180,
          marketPrice: 190,
          currency: "USD",
          sector: "Technology",
          industry: "Consumer Electronics",
          country: "US",
          beta: 1.1,
          returnsSeries: [0.01, 0.02],
        },
        {
          symbol: "MSFT",
          quantity: 8,
          averageCost: 300,
          marketPrice: 310,
          currency: "USD",
          sector: "Technology",
          industry: "Software",
          country: "US",
          beta: 1.0,
          returnsSeries: [0.015, 0.01],
        },
      ],
    });

    expect(snapshot.returns.status).toBe("MEASURED");
    expect(snapshot.volatility.status).toBe("MEASURED");
    expect(snapshot.drawdown.status).toBe("MEASURED");
    expect(snapshot.sharpe.status).toBe("MEASURED");
    expect(snapshot.sortino.status).toBe("MEASURED");
    expect(snapshot.beta.status).toBe("MEASURED");
    expect(snapshot.correlations.status).toBe("MEASURED");
    expect(snapshot.byPosition.length).toBe(2);
    expect(snapshot.bySector[0]?.label).toBe("Technology");
    expect(snapshot.exposure.value).not.toBeNull();
  });

  it("degrades metrics to NOT_MEASURED when data missing", () => {
    const snapshot = computePortfolioAnalytics({
      asOf: "2026-07-30T00:00:00.000Z",
      baseCurrency: "UNKNOWN",
      cash: null,
      riskFreeRate: null,
      benchmarkReturns: [],
      portfolioReturns: [],
      positions: [],
    });

    expect(snapshot.returns.status).toBe("NOT_MEASURED");
    expect(snapshot.drawdown.status).toBe("NOT_MEASURED");
    expect(snapshot.volatility.status).toBe("NOT_MEASURED");
    expect(snapshot.beta.status).toBe("NOT_MEASURED");
    expect(snapshot.correlations.status).toBe("NOT_MEASURED");
    expect(snapshot.cash.status).toBe("UNKNOWN");
    expect(snapshot.byPosition).toHaveLength(0);
  });

  it("keeps snapshot fully serializable", () => {
    const snapshot = computePortfolioAnalytics({
      asOf: "2026-07-30T00:00:00.000Z",
      baseCurrency: "USD",
      cash: 0,
      riskFreeRate: 0,
      benchmarkReturns: [0.01, 0.01],
      portfolioReturns: [0.01, 0.01],
      positions: [],
    });
    expect(() => ensurePortfolioAnalyticsSnapshot(snapshot)).not.toThrow();
    expect(() => JSON.stringify(snapshot)).not.toThrow();
  });
});
