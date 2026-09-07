import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ContinuousPortfolioMonitor,
  StaticPortfolioMonitorSnapshotProvider,
  InMemoryPortfolioMonitorStore,
  detectDuplicateSymbols,
  ensurePortfolioMonitorAlert,
  ensurePortfolioMonitorSnapshot,
  generateMonitorAlerts,
  defaultPortfolioMonitorPolicy,
  buildObservationFromAnalytics,
  type PortfolioMonitorAlert,
} from "..";
import { computePortfolioAnalytics } from "../../application/portfolio-analytics-engine";
import type { PortfolioAnalyticsInput } from "../../domain/portfolio-analytics";

function richInput(overrides?: Partial<PortfolioAnalyticsInput>): PortfolioAnalyticsInput {
  return {
    asOf: "2026-07-30T12:00:00.000Z",
    baseCurrency: "USD",
    cash: 1_000,
    riskFreeRate: 0.001,
    benchmarkReturns: [0.01, -0.02, 0.015, -0.01, 0.008, -0.012, 0.004],
    portfolioReturns: [0.02, -0.04, 0.01, -0.05, 0.005, -0.03, -0.02],
    positions: [
      {
        symbol: "AAPL",
        quantity: 50,
        averageCost: 160,
        marketPrice: 190,
        currency: "USD",
        sector: "Technology",
        industry: "Consumer Electronics",
        country: "US",
        beta: 1.8,
        returnsSeries: [0.03, -0.02, 0.02, -0.03, 0.01],
      },
      {
        symbol: "AAPL",
        quantity: 5,
        averageCost: 165,
        marketPrice: 190,
        currency: "USD",
        sector: "Technology",
        industry: "Consumer Electronics",
        country: "US",
        beta: 1.8,
        returnsSeries: [0.03, -0.02, 0.02, -0.03, 0.01],
      },
      {
        symbol: "MSFT",
        quantity: 4,
        averageCost: 300,
        marketPrice: 310,
        currency: "USD",
        sector: "Technology",
        industry: "Software",
        country: "US",
        beta: 1.2,
        returnsSeries: [0.01, -0.01, 0.015, -0.012, 0.008],
      },
    ],
    ...overrides,
  };
}

describe("portfolio monitor detection rules", () => {
  it("detects duplicate symbols", () => {
    const dups = detectDuplicateSymbols(richInput());
    expect(dups.some((d) => d.symbol === "AAPL" && d.count === 2)).toBe(true);
  });

  it("emits drawdown, concentration, dominant, duplicate, beta, and allocation alerts", () => {
    const input = richInput();
    const analytics = computePortfolioAnalytics(input);
    const alerts = generateMonitorAlerts({
      input,
      analytics,
      previous: null,
      nowIso: "2026-07-30T12:00:00.000Z",
      policy: {
        ...defaultPortfolioMonitorPolicy(),
        maxDrawdownPct: 1,
        maxConcentrationPct: 10,
        maxDominantPositionPct: 10,
        maxBeta: 1.0,
        minCashPct: 50,
        maxSectorWeightPct: 20,
        maxCountryWeightPct: 20,
        maxCurrencyWeightPct: 20,
      },
    });

    const codes = new Set(alerts.map((a) => a.code));
    expect(codes.has("DRAWDOWN") || codes.has("PNL_PRESSURE")).toBe(true);
    expect(codes.has("DUPLICATE_POSITION")).toBe(true);
    expect(codes.has("DOMINANT_POSITION") || codes.has("CONCENTRATION")).toBe(true);
    expect(codes.has("BETA_ELEVATED") || codes.has("SECTOR_CONCENTRATION")).toBe(true);
    expect(alerts.some((a) => a.category === "PortfolioAlerts")).toBe(true);
    expect(alerts.some((a) => a.category === "RiskAlerts" || a.category === "AllocationAlerts")).toBe(true);
  });

  it("detects rising risk and liquidity changes against prior observation", () => {
    const input = richInput({ cash: 5_000 });
    const analytics = computePortfolioAnalytics(input);
    const previous = buildObservationFromAnalytics(analytics);
    const prior = {
      ...previous,
      totalRisk: {
        status: previous.totalRisk.status,
        value: (previous.totalRisk.value ?? 10) - 20,
        unit: previous.totalRisk.unit,
      },
      cash: {
        status: previous.cash.status,
        value: 1_000,
        unit: previous.cash.unit,
      },
    };
    const alerts = generateMonitorAlerts({
      input,
      analytics,
      previous: prior,
      nowIso: "2026-07-30T12:05:00.000Z",
      policy: {
        ...defaultPortfolioMonitorPolicy(),
        risingRiskDelta: 5,
        liquidityChangePct: 10,
      },
    });
    const codes = new Set(alerts.map((a) => a.code));
    expect(codes.has("RISING_RISK")).toBe(true);
    expect(codes.has("LIQUIDITY_CHANGE")).toBe(true);
  });

  it("keeps alerts and snapshots serializable", () => {
    const alert: PortfolioMonitorAlert = ensurePortfolioMonitorAlert({
      id: "test-1",
      category: "RiskAlerts",
      code: "DRAWDOWN",
      severity: "WARN",
      title: "Drawdown",
      message: "Test",
      metric: "drawdown",
      value: 12,
      threshold: 10,
      symbols: ["AAPL"],
      detectedAt: "2026-07-30T12:00:00.000Z",
      evidence: ["drawdown=12"],
    });
    expect(() => JSON.parse(JSON.stringify(alert))).not.toThrow();

    const monitor = new ContinuousPortfolioMonitor({
      snapshotProvider: new StaticPortfolioMonitorSnapshotProvider(richInput()),
      store: new InMemoryPortfolioMonitorStore(),
      now: () => new Date("2026-07-30T12:00:00.000Z"),
      pollIntervalMs: 20_000,
    });
    return monitor.evaluateNow().then((snapshot) => {
      ensurePortfolioMonitorSnapshot(snapshot);
      expect(snapshot.mode).toBe("ANALYSIS_ONLY");
      expect(snapshot.orderExecution).toBe("disabled");
      expect(snapshot.observation?.positionCount).toBeGreaterThan(0);
      expect(() => JSON.parse(JSON.stringify(snapshot))).not.toThrow();
    });
  });
});

describe("portfolio monitor no-order contract", () => {
  it("exposes evaluate/start/stop/getSnapshot only — no order methods", () => {
    const monitor = new ContinuousPortfolioMonitor({
      snapshotProvider: new StaticPortfolioMonitorSnapshotProvider(richInput()),
      pollIntervalMs: 20_000,
    });
    expect(typeof monitor.evaluateNow).toBe("function");
    expect(typeof monitor.getSnapshot).toBe("function");
    expect(typeof monitor.start).toBe("function");
    expect(typeof monitor.stop).toBe("function");
    expect("placeOrder" in monitor).toBe(false);
    expect("executeOrder" in monitor).toBe(false);
    expect("sendOrder" in monitor).toBe(false);
    expect("submitOrder" in monitor).toBe(false);
  });

  it("snapshot stamps ANALYSIS_ONLY and disabled order execution", async () => {
    const monitor = new ContinuousPortfolioMonitor({
      snapshotProvider: new StaticPortfolioMonitorSnapshotProvider(richInput()),
      pollIntervalMs: 20_000,
    });
    const snapshot = await monitor.evaluateNow();
    expect(snapshot.mode).toBe("ANALYSIS_ONLY");
    expect(snapshot.orderExecution).toBe("disabled");
  });
});

describe("portfolio monitor broker isolation", () => {
  it("does not import broker/IBKR modules from package sources", () => {
    const root = join(__dirname, "..");
    const files = ["domain.ts", "application.ts", "infrastructure.ts", "presentation.ts", "index.ts"];
    for (const file of files) {
      const source = readFileSync(join(root, file), "utf8");
      expect(source.toLowerCase()).not.toMatch(/ibkr|broker-engine|interactive.?brokers|placeorder|sendorder/);
    }
  });
});
