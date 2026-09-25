import { describe, expect, it } from "vitest";
import { MultiVentureExecutor } from "../execution";
import { createTestPorts } from "../../testing/in-memory";
import { Portfolio } from "../../../domain/portfolio/aggregate";
import { asVentureId, asWorkspaceId } from "../../../domain/shared/ids";

function createPortfolioFixture() {
  const created = Portfolio.create({
    id: "pf-risk",
    workspaceId: asWorkspaceId("ws-risk"),
    name: "Risk Portfolio",
    slug: "risk-portfolio",
    now: "2026-07-24T12:00:00.000Z",
  });
  if (!created.ok) {
    throw new Error(created.error.message);
  }
  const withVenture = created.value.addVenture({
    ventureId: asVentureId("ven-1"),
    lifecycle: "LAUNCHED",
    priority: "CRITICAL",
    now: "2026-07-24T12:00:00.000Z",
  });
  if (!withVenture.ok) {
    throw new Error(withVenture.error.message);
  }
  return withVenture.value.toSnapshot();
}

describe("MultiVentureExecutor risk gate", () => {
  it("blocks execution when risk checks fail", async () => {
    const { ports } = createTestPorts();
    const portfolioFixture = createPortfolioFixture();
    let runtimeCalls = 0;
    ports.execution.requestExecution = async () => {
      runtimeCalls += 1;
      return { accepted: true, executionId: "exec-risk" };
    };
    const executor = new MultiVentureExecutor(ports);

    const result = await executor.submit(portfolioFixture, {
      workspaceId: "ws-risk",
      portfolioId: "pf-risk",
      ventureId: "ven-1",
      missionId: "mission-1",
      priority: "CRITICAL",
      executionClass: "AI",
      ownerId: "actor",
      isolationContext: "isolation",
      riskContext: {
        operationId: "risk-op",
        symbol: "RISK",
        side: "BUY",
        quantity: 50_000,
        price: 100,
        sector: "TECH",
        country: "US",
        currency: "USD",
        expectedReturnPct: 4,
        volatilityPct: 95,
        confidence: 0.55,
        currentPositionPct: 8,
        currentSectorExposurePct: 29,
        currentCountryExposurePct: 34,
        currentCurrencyExposurePct: 39,
        currentDrawdownPct: 14,
        currentGrossExposurePct: 119,
        portfolioValue: 1_000_000,
        avgDailyVolume: 100_000,
        bidAskSpreadPct: 2.5,
        openPositions: 20,
      },
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.riskValidation?.blockReasons.length).toBeGreaterThan(0);
    expect(result.error).toContain("Operation blocked");
    expect(runtimeCalls).toBe(0);
  });

  it("continues execution when risk checks pass", async () => {
    const { ports } = createTestPorts();
    const portfolioFixture = createPortfolioFixture();
    let runtimeCalls = 0;
    ports.execution.requestExecution = async () => {
      runtimeCalls += 1;
      return { accepted: true, executionId: "exec-pass" };
    };
    const executor = new MultiVentureExecutor(ports);

    const result = await executor.submit(portfolioFixture, {
      workspaceId: "ws-risk",
      portfolioId: "pf-risk",
      ventureId: "ven-1",
      missionId: "mission-2",
      priority: "HIGH",
      executionClass: "AI",
      ownerId: "actor",
      isolationContext: "isolation",
      riskContext: {
        operationId: "risk-op-pass",
        symbol: "SAFE",
        side: "BUY",
        quantity: 100,
        price: 100,
        sector: "TECH",
        country: "US",
        currency: "USD",
        expectedReturnPct: 12,
        volatilityPct: 8,
        confidence: 0.65,
        currentPositionPct: 1,
        currentSectorExposurePct: 5,
        currentCountryExposurePct: 6,
        currentCurrencyExposurePct: 9,
        currentDrawdownPct: 2,
        currentGrossExposurePct: 20,
        portfolioValue: 1_000_000,
        avgDailyVolume: 1_000_000,
        bidAskSpreadPct: 0.1,
        openPositions: 6,
      },
    });

    expect(result.status).toBe("ACCEPTED");
    expect(result.executionId).toBeDefined();
    expect(runtimeCalls).toBe(1);
  });

  it("halts live submission when system barrier fails", async () => {
    const { ports } = createTestPorts();
    const portfolioFixture = createPortfolioFixture();
    let runtimeCalls = 0;
    ports.execution.requestExecution = async () => {
      runtimeCalls += 1;
      return { accepted: true, executionId: "exec-halt" };
    };
    const executor = new MultiVentureExecutor(ports);

    const result = await executor.submit(portfolioFixture, {
      workspaceId: "ws-risk",
      portfolioId: "pf-risk",
      ventureId: "ven-1",
      missionId: "mission-halt",
      priority: "CRITICAL",
      executionClass: "AI",
      ownerId: "actor",
      isolationContext: "isolation",
      liveRiskInput: {
        account: {
          availableCapital: 1_000_000,
          availableMargin: 500_000,
          excessLiquidity: 500_000,
          dailyDrawdownPct: 3,
          weeklyDrawdownPct: 5,
          monthlyDrawdownPct: 8,
          maxDailyLoss: 50_000,
          currentDailyLoss: 10_000,
          maxNumberOfOrders: 100,
          currentNumberOfOrders: 5,
          maxNumberOfPositions: 80,
          currentNumberOfPositions: 5,
          grossExposure: 20,
          maxGrossExposure: 120,
          netExposure: 10,
          maxNetExposure: 80,
          leverage: 1.1,
          maxLeverage: 3,
          concentration: 12,
          maxConcentration: 40,
          currency: "USD",
          allowedCurrencies: ["USD"],
          country: "US",
          allowedCountries: ["US"],
          sector: "TECH",
          allowedSectors: ["TECH"],
          correlation: 0.2,
          maxCorrelation: 0.9,
          gapRisk: 0.1,
          maxGapRisk: 0.8,
        },
        order: {
          requestedQuantity: 100,
          maxQuantity: 500,
          requestedNotional: 10_000,
          maxNotional: 50_000,
          requestedRiskPerTrade: 500,
          maxRiskPerTrade: 1_500,
          mandatoryStopPresent: true,
          stopDistance: 1.5,
          minStopDistance: 1,
          spreadBps: 8,
          maxSpreadBps: 30,
          slippageBps: 10,
          maxSlippageBps: 40,
          volume: 1_000_000,
          minVolume: 100_000,
          price: 100,
          tickSize: 0.01,
          inAllowedSession: true,
          allowedProduct: true,
          allowedMarket: true,
          allowedDirection: true,
          shortAllowed: true,
          side: "BUY",
          realtimeDataAvailable: true,
          contractResolvedWithoutAmbiguity: true,
        },
        system: {
          stableConnection: false,
          heartbeatHealthy: true,
          clockSynchronized: true,
          freshData: true,
          brokerReconciled: true,
          noOrphanOrders: true,
          noUnknownState: true,
          noEmergencyStop: true,
          noActiveCircuitBreaker: true,
        },
      },
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.liveRisk?.decision).toBe("HALT_SYSTEM");
    expect(runtimeCalls).toBe(0);
  });
});
