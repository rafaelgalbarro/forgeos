import { describe, expect, it, vi } from "vitest";
import type { BrokerEngine } from "@/src/core/application/ports/broker-engine";
import {
  createInMemoryInvestmentMemoryRepository,
  createInvestmentMemoryService,
  createShadowTradingService,
  wrapBrokerEngineWithShadowGuard,
} from "..";

function createShadowService(minimumDurationMs = 0) {
  let seq = 0;
  const repository = createInMemoryInvestmentMemoryRepository();
  const memoryService = createInvestmentMemoryService({
    repository,
    now: () => "2026-07-30T10:00:00.000Z",
    createId: (kind) => {
      seq += 1;
      return `${kind}-${seq}`;
    },
  });
  const service = createShadowTradingService({
    config: { shadowMode: true, liveTradingEnabled: false, minimumDurationMs },
    memoryService,
  });
  return { service, memoryService };
}

describe("Shadow trading mode", () => {
  it("enforces no-order-send broker guardrail in SHADOW_MODE", async () => {
    const delegate: BrokerEngine = {
      name: "paper",
      request: vi.fn(async () => ({ ok: true })),
    };
    const guarded = wrapBrokerEngineWithShadowGuard(delegate, {
      SHADOW_MODE: "true",
      LIVE_TRADING_ENABLED: "false",
    } as NodeJS.ProcessEnv);

    await expect(
      guarded.request({ method: "POST", path: "/api/ibkr/orders", body: "{}" }),
    ).rejects.toThrow(/blocked broker submission path/i);
    expect(delegate.request).not.toHaveBeenCalled();
  });

  it("creates shadow hypothetical records and result records", async () => {
    const { service, memoryService } = createShadowService();
    await service.evaluate({
      signal: {
        signalId: "sig-1",
        occurredAtUtc: "2026-07-30T09:59:00.000Z",
        symbol: "AAPL",
        side: "BUY",
        quantity: 10,
        expectedPrice: 200,
        strategy: "momentum",
        reason: "committee approved",
      },
      market: {
        capturedAtUtc: "2026-07-30T09:59:05.000Z",
        bid: 199.8,
        ask: 200.2,
        last: 201,
        latencyMs: 24,
        liquidityScore: 87,
        missingData: [],
      },
      portfolio: { accountEquity: 100_000, cashAvailable: 50_000, currentPositionQty: 5 },
      sessionOpen: true,
      nowUtc: "2026-07-30T10:00:00.000Z",
    });

    const records = await memoryService.queryDecisionHistory();
    const shadowOp = records.find((record) => record.kind === "simulated_operation");
    const shadowResult = records.find((record) => record.kind === "result");
    expect(shadowOp).toBeTruthy();
    expect((shadowOp?.payload as { mode?: string }).mode).toBe("shadow");
    expect(shadowResult).toBeTruthy();
  });

  it("computes paper-vs-shadow differences from reference", async () => {
    const { service } = createShadowService();
    const evaluated = await service.evaluate({
      signal: {
        signalId: "sig-2",
        occurredAtUtc: "2026-07-30T09:58:00.000Z",
        symbol: "MSFT",
        side: "BUY",
        quantity: 8,
        expectedPrice: 100,
        strategy: "breakout",
        reason: "risk and liquidity approved",
      },
      market: {
        capturedAtUtc: "2026-07-30T09:58:02.000Z",
        bid: 99.9,
        ask: 100.4,
        last: 101,
        latencyMs: 18,
        liquidityScore: 70,
        missingData: [],
      },
      portfolio: { accountEquity: 90_000, cashAvailable: 30_000, currentPositionQty: 2 },
      sessionOpen: true,
      nowUtc: "2026-07-30T10:00:00.000Z",
      paperReference: {
        simulatedFillPrice: 100.1,
        simulatedPnl: 2.2,
        simulatedSlippageBps: 4,
      },
    });

    expect(evaluated.outcome.paperDifference).toBeTruthy();
    expect(evaluated.outcome.paperDifference?.fillPriceDelta).not.toBe(0);
  });

  it("handles missing data by rejecting simulated fill with reason", async () => {
    const { service } = createShadowService();
    const evaluated = await service.evaluate({
      signal: {
        signalId: "sig-3",
        occurredAtUtc: "2026-07-30T09:57:00.000Z",
        symbol: "NVDA",
        side: "SELL",
        quantity: 6,
        expectedPrice: 120,
        strategy: "mean-reversion",
        reason: "partial market feed",
      },
      market: {
        capturedAtUtc: "2026-07-30T09:57:04.000Z",
        last: 119.5,
        latencyMs: 55,
        liquidityScore: 40,
        missingData: ["ask", "bid"],
      },
      portfolio: { accountEquity: 120_000, cashAvailable: 45_000, currentPositionQty: 20 },
      sessionOpen: true,
      nowUtc: "2026-07-30T10:00:00.000Z",
    });

    expect(evaluated.outcome.simulatedFill.status).toBe("REJECTED");
    expect(evaluated.outcome.rejectedSignals).toContain("session_or_data_block");
    expect(evaluated.outcome.missingData).toEqual(["ask", "bid"]);
  });

  it("enforces configurable minimum duration before evaluation", async () => {
    const { service, memoryService } = createShadowService(120_000);
    await expect(
      service.evaluate({
        signal: {
          signalId: "sig-4",
          occurredAtUtc: "2026-07-30T09:59:30.000Z",
          symbol: "TSLA",
          side: "BUY",
          quantity: 3,
          expectedPrice: 250,
          strategy: "swing",
          reason: "duration gate test",
        },
        market: {
          capturedAtUtc: "2026-07-30T09:59:35.000Z",
          last: 250.5,
          latencyMs: 22,
          liquidityScore: 90,
          missingData: [],
        },
        portfolio: { accountEquity: 150_000, cashAvailable: 70_000, currentPositionQty: 0 },
        sessionOpen: true,
        nowUtc: "2026-07-30T10:00:00.000Z",
      }),
    ).rejects.toThrow(/minimum duration/i);

    const errors = await memoryService.queryDecisionHistory({ kind: "error" });
    expect(errors).toHaveLength(1);
    expect((errors[0].payload as { reason?: string }).reason).toBe("minimum_duration_not_met");
  });
});
