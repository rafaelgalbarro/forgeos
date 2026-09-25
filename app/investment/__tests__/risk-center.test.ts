import { describe, expect, it } from "vitest";
import {
  buildAdvisoryRecommendations,
  runRiskScenarioSimulations,
  trafficLightForMetric,
  type RiskMetricReading,
} from "@/lib/investment/risk-center-scenarios";

const thresholds = {
  maxDrawdownPct: 10,
  maxConcentrationPct: 35,
  maxCorrelation: 0.85,
  maxBeta: 1.5,
  maxExposurePct: 120,
  maxVarPct: 3,
  maxCvarPct: 4,
  minLiquidityScoreOrCashPct: 5,
};

function metric(
  key: RiskMetricReading["key"],
  value: number | null,
  overrides?: Partial<RiskMetricReading>,
): RiskMetricReading {
  return {
    key,
    label: key,
    value,
    unit: value == null ? "NO_DATA" : key === "beta" || key === "correlations" ? "RATIO" : "PCT",
    display: value == null ? "NO_DATA" : String(value),
    status: value == null ? "NO_DATA" : "MEASURED",
    light: trafficLightForMetric(key, value, thresholds),
    note: "test",
    source: "test",
    ...overrides,
  };
}

describe("risk center scenarios", () => {
  it("runs five analysis-only simulations without order execution", () => {
    const metrics = [
      metric("exposure", 80),
      metric("drawdown", 4),
      metric("var", 1.5),
      metric("expectedShortfall", 2),
      metric("beta", 1.1),
      metric("volatility", 2.5),
      metric("liquidity", 12),
      metric("concentration", 22),
      metric("correlations", 0.6),
    ];
    const scenarios = runRiskScenarioSimulations(metrics);
    expect(scenarios).toHaveLength(5);
    expect(scenarios.map((s) => s.id)).toEqual([
      "CRASH",
      "HIGH_VOLATILITY",
      "RATE_HIKE",
      "INFLATION",
      "RECESSION",
    ]);
    for (const s of scenarios) {
      expect(s.mode).toBe("ANALYSIS_ONLY");
      expect(s.orderExecution).toBe("disabled");
      expect(["SIMULATION", "DEMO"]).toContain(s.label);
      expect(s.note.toLowerCase()).toMatch(/simulation|demo|analysis_only/);
    }
  });

  it("labels DEMO when requested and keeps NO_DATA baselines honest", () => {
    const scenarios = runRiskScenarioSimulations(
      [
        metric("exposure", null),
        metric("drawdown", null),
        metric("var", null),
        metric("expectedShortfall", null),
        metric("beta", null),
        metric("volatility", null),
        metric("liquidity", null),
        metric("concentration", null),
        metric("correlations", null),
      ],
      { demoLabel: true },
    );
    expect(scenarios.every((s) => s.label === "DEMO")).toBe(true);
    expect(scenarios.every((s) => s.severity === "NO_DATA")).toBe(true);
  });

  it("recommendations stay ADVISORY_ONLY with autoExecute false", () => {
    const metrics = [
      metric("exposure", 130),
      metric("drawdown", 12),
      metric("concentration", 40),
      metric("liquidity", 3),
      metric("correlations", 0.9),
      metric("var", null),
      metric("expectedShortfall", null),
      metric("beta", 1.8),
      metric("volatility", 5),
    ];
    const scenarios = runRiskScenarioSimulations(metrics);
    const recs = buildAdvisoryRecommendations({
      metrics,
      alertCodes: ["BETA_ELEVATED"],
      scenarios,
    });
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) {
      expect(r.autoExecute).toBe(false);
      expect(r.label).toBe("ADVISORY_ONLY");
    }
  });

  it("traffic lights return NO_DATA for null values", () => {
    expect(trafficLightForMetric("var", null, thresholds)).toBe("NO_DATA");
    expect(trafficLightForMetric("drawdown", 12, thresholds)).toBe("RED");
    expect(trafficLightForMetric("beta", 1.0, thresholds)).toBe("GREEN");
  });
});

describe("risk center page and snapshot posture", () => {
  it("exports risk page component", async () => {
    const mod = await import("../risk/page");
    expect(typeof mod.default).toBe("function");
  }, 30_000);

  it("snapshot stays ANALYSIS_ONLY with simulation gates", async () => {
    const { getRiskCenterSnapshot } = await import("@/lib/investment/risk-center-snapshot");
    const snap = await getRiskCenterSnapshot();
    expect(snap.mode).toBe("ANALYSIS_ONLY");
    expect(snap.orderExecution).toBe("disabled");
    expect(snap.liveTradingEnabled).toBe(false);
    expect(snap.ibkrReadOnly).toBe(true);
    expect(snap.posture.autoExecuteRecommendations).toBe(false);
    expect(snap.posture.scenariosMutatePortfolio).toBe(false);
    expect(snap.metrics).toHaveLength(9);
    expect(snap.metrics.map((m) => m.key)).toEqual([
      "exposure",
      "drawdown",
      "var",
      "expectedShortfall",
      "beta",
      "volatility",
      "liquidity",
      "concentration",
      "correlations",
    ]);
    expect(snap.stressTest.label).toBe("SIMULATION");
    expect(snap.stressTest.orderExecution).toBe("disabled");
    expect(snap.stressTest.scenarios).toHaveLength(5);
    for (const r of snap.recommendations) {
      expect(r.autoExecute).toBe(false);
    }
    for (const m of snap.metrics) {
      if (m.status === "NO_DATA") {
        expect(m.display).toBe("NO_DATA");
        expect(m.value).toBeNull();
      }
    }
  }, 60_000);
});
