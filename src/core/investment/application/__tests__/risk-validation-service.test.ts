import { describe, expect, it } from "vitest";
import { RiskValidationService } from "../risk-validation-service";
import type { OperationRiskContext, RiskPolicy } from "../../domain/risk";
import { DEFAULT_RISK_POLICY } from "../../domain/risk";

const baseContext: OperationRiskContext = {
  operationId: "op-1",
  symbol: "AAPL",
  side: "BUY",
  quantity: 100,
  price: 100,
  sector: "TECH",
  country: "US",
  currency: "USD",
  expectedReturnPct: 15,
  volatilityPct: 10,
  confidence: 0.62,
  currentPositionPct: 1,
  currentSectorExposurePct: 4,
  currentCountryExposurePct: 6,
  currentCurrencyExposurePct: 8,
  currentDrawdownPct: 2,
  currentGrossExposurePct: 20,
  portfolioValue: 1_000_000,
  avgDailyVolume: 1_000_000,
  bidAskSpreadPct: 0.1,
  openPositions: 8,
};

function policy(overrides: Partial<RiskPolicy>): RiskPolicy {
  return { ...DEFAULT_RISK_POLICY, ...overrides };
}

describe("RiskValidationService", () => {
  const service = new RiskValidationService();

  it("allows operation when all institutional rules pass", () => {
    const result = service.validateOperation(baseContext);
    expect(result.status).toBe("ALLOWED");
    expect(result.checks.every((check) => check.passed)).toBe(true);
    expect(result.recommendations.stopLossPct).toBeGreaterThan(0);
    expect(result.recommendations.takeProfitPct).toBeGreaterThan(
      result.recommendations.stopLossPct,
    );
  });

  it.each([
    {
      rule: "posición máxima",
      context: { quantity: 5_000 },
      policy: policy({ maxPositionPct: 1 }),
    },
    {
      rule: "riesgo máximo",
      context: { volatilityPct: 80 },
      policy: policy({ maxRiskPct: 0.5 }),
    },
    {
      rule: "sector máximo",
      context: { currentSectorExposurePct: 29, quantity: 200 },
      policy: policy({ maxSectorPct: 30 }),
    },
    {
      rule: "país máximo",
      context: { currentCountryExposurePct: 34, quantity: 200 },
      policy: policy({ maxCountryPct: 35 }),
    },
    {
      rule: "divisa máxima",
      context: { currentCurrencyExposurePct: 39, quantity: 200 },
      policy: policy({ maxCurrencyPct: 40 }),
    },
    {
      rule: "drawdown máximo",
      context: { currentDrawdownPct: 14, volatilityPct: 60, quantity: 1_000 },
      policy: policy({ maxDrawdownPct: 14.5 }),
    },
    {
      rule: "VaR",
      context: { volatilityPct: 95, quantity: 2_000 },
      policy: policy({ maxVarPct: 0.2 }),
    },
    {
      rule: "CVaR",
      context: { volatilityPct: 95, quantity: 2_000 },
      policy: policy({ maxVarPct: 5, maxCvarPct: 0.3 }),
    },
    {
      rule: "Kelly",
      context: { confidence: 0.1, expectedReturnPct: 1, volatilityPct: 40, quantity: 5_000 },
      policy: policy({ maxPositionPct: 20, kellyFractionCap: 0.1 }),
    },
    {
      rule: "Maximum Exposure",
      context: { currentGrossExposurePct: 119, quantity: 200 },
      policy: policy({ maxExposurePct: 120 }),
    },
    {
      rule: "Liquidity",
      context: { quantity: 700_000, avgDailyVolume: 1_000_000, bidAskSpreadPct: 2.5 },
      policy: policy({ minLiquidityScore: 0.4 }),
    },
    {
      rule: "Position Size",
      context: { quantity: 10_000, confidence: 0.3, expectedReturnPct: 4 },
      policy: policy({ maxPositionPct: 10 }),
    },
  ])("blocks when $rule fails", ({ rule, context, policy }) => {
    const result = service.validateOperation({ ...baseContext, ...context }, policy);
    expect(result.status).toBe("BLOCKED");
    const failed = result.checks.find((check) => check.rule === rule);
    expect(failed?.passed).toBe(false);
    expect(result.explanation).toContain("Operation blocked");
  });

  it("aggregates multiple failures with detailed reasons", () => {
    const result = service.validateOperation(
      {
        ...baseContext,
        quantity: 15_000,
        volatilityPct: 90,
        currentGrossExposurePct: 119,
      },
      policy({ maxPositionPct: 1, maxRiskPct: 0.2, maxExposurePct: 120 }),
    );
    expect(result.status).toBe("BLOCKED");
    expect(result.blockReasons.length).toBeGreaterThan(1);
    expect(result.blockReasons[0].message.length).toBeGreaterThan(10);
  });

  it("returns serializable output payload", () => {
    const result = service.validateOperation(baseContext);
    const serialized = JSON.stringify(result);
    expect(typeof serialized).toBe("string");
    expect(JSON.parse(serialized).status).toBe("ALLOWED");
  });
});
