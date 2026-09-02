import { describe, expect, it } from "vitest";
import type {
  LiveRiskAuditRecord,
  LiveRiskAuditStore,
} from "../infrastructure";
import type { LiveRiskOverrideRequest } from "../domain";
import {
  InMemoryLiveRiskAuditStore,
  LiveRiskEvaluator,
  type LiveRiskEvaluationInput,
} from "..";

class CountingAuditStore implements LiveRiskAuditStore {
  private readonly records = new Map<string, LiveRiskAuditRecord>();
  writes = 0;

  async findByRequestId(requestId: string): Promise<LiveRiskAuditRecord | null> {
    return this.records.get(requestId) ?? null;
  }
  async write(record: LiveRiskAuditRecord): Promise<void> {
    this.writes += 1;
    this.records.set(record.requestId, record);
  }
  async writeOverride(_request: LiveRiskOverrideRequest): Promise<void> {}
}

function buildInput(overrides: Partial<LiveRiskEvaluationInput> = {}): LiveRiskEvaluationInput {
  return {
    requestId: "req-1",
    evaluatedAtUtc: "2026-07-30T12:00:00.000Z",
    account: {
      availableCapital: 1_000_000,
      availableMargin: 500_000,
      excessLiquidity: 500_000,
      dailyDrawdownPct: 5,
      weeklyDrawdownPct: 7,
      monthlyDrawdownPct: 12,
      maxDailyLoss: 50_000,
      currentDailyLoss: 20_000,
      maxNumberOfOrders: 100,
      currentNumberOfOrders: 20,
      maxNumberOfPositions: 50,
      currentNumberOfPositions: 10,
      grossExposure: 40,
      maxGrossExposure: 120,
      netExposure: 25,
      maxNetExposure: 80,
      leverage: 1.2,
      maxLeverage: 3,
      concentration: 15,
      maxConcentration: 40,
      currency: "USD",
      allowedCurrencies: ["USD", "EUR"],
      country: "US",
      allowedCountries: ["US", "DE"],
      sector: "TECH",
      allowedSectors: ["TECH", "HEALTH"],
      correlation: 0.35,
      maxCorrelation: 0.9,
      gapRisk: 0.2,
      maxGapRisk: 0.8,
    },
    order: {
      requestedQuantity: 100,
      maxQuantity: 500,
      requestedNotional: 10_000,
      maxNotional: 60_000,
      requestedRiskPerTrade: 500,
      maxRiskPerTrade: 1_000,
      mandatoryStopPresent: true,
      stopDistance: 1.5,
      minStopDistance: 1,
      spreadBps: 12,
      maxSpreadBps: 50,
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
      stableConnection: true,
      heartbeatHealthy: true,
      clockSynchronized: true,
      freshData: true,
      brokerReconciled: true,
      noOrphanOrders: true,
      noUnknownState: true,
      noEmergencyStop: true,
      noActiveCircuitBreaker: true,
    },
    ...overrides,
  };
}

describe("LiveRiskEvaluator", () => {
  it("passes when account, order and system validations pass", async () => {
    const evaluator = new LiveRiskEvaluator(new InMemoryLiveRiskAuditStore());
    const result = await evaluator.evaluate(buildInput());
    expect(result.decision).toBe("PASS");
    expect(result.checks.length).toBe(44);
  });

  it("blocks when account validation fails", async () => {
    const evaluator = new LiveRiskEvaluator(new InMemoryLiveRiskAuditStore());
    const result = await evaluator.evaluate(
      buildInput({
        account: {
          ...buildInput().account,
          currentDailyLoss: 90_000,
        },
      }),
    );
    expect(result.decision).toBe("BLOCK");
  });

  it("returns PASS_WITH_REDUCED_SIZE when reducible order checks fail", async () => {
    const evaluator = new LiveRiskEvaluator(new InMemoryLiveRiskAuditStore());
    const result = await evaluator.evaluate(
      buildInput({
        order: {
          ...buildInput().order,
          requestedQuantity: 900,
          maxQuantity: 400,
        },
      }),
    );
    expect(result.decision).toBe("PASS_WITH_REDUCED_SIZE");
    expect(result.reducedQuantity).toBeLessThanOrEqual(400);
  });

  it("halts when a system safety validation fails", async () => {
    const evaluator = new LiveRiskEvaluator(new InMemoryLiveRiskAuditStore());
    const result = await evaluator.evaluate(
      buildInput({
        system: {
          ...buildInput().system,
          stableConnection: false,
        },
      }),
    );
    expect(result.decision).toBe("HALT_SYSTEM");
  });

  it("does not allow HALT_SYSTEM bypass via override", async () => {
    const evaluator = new LiveRiskEvaluator(new InMemoryLiveRiskAuditStore());
    const result = await evaluator.evaluate(
      buildInput({
        system: {
          ...buildInput().system,
          freshData: false,
        },
        overrideRequest: {
          overrideId: "ovr-halt",
          identity: "risk.officer",
          reason: "temporary incident",
          approvedBy: "head-of-risk",
          requestedAtUtc: "2026-07-30T12:00:00.000Z",
          expiresAtUtc: "2026-07-30T15:00:00.000Z",
        },
      }),
    );
    expect(result.decision).toBe("HALT_SYSTEM");
    expect(result.overrideAudit).toBeUndefined();
  });

  it("requires identity, reason and expiry for override", async () => {
    const evaluator = new LiveRiskEvaluator(new InMemoryLiveRiskAuditStore());
    await expect(
      evaluator.evaluate(
        buildInput({
          requestId: "req-override-invalid",
          account: {
            ...buildInput().account,
            currentDailyLoss: 90_000,
          },
          overrideRequest: {
            overrideId: "ovr-1",
            identity: "",
            reason: "",
            approvedBy: "head-of-risk",
            requestedAtUtc: "2026-07-30T12:00:00.000Z",
            expiresAtUtc: "2026-07-30T11:00:00.000Z",
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it("writes audit records and enforces idempotent request IDs", async () => {
    const store = new CountingAuditStore();
    const evaluator = new LiveRiskEvaluator(store);
    const requestId = "req-idempotent";

    const first = await evaluator.evaluate(buildInput({ requestId }));
    const second = await evaluator.evaluate(
      buildInput({
        requestId,
        account: {
          ...buildInput().account,
          currentDailyLoss: 90_000,
        },
      }),
    );

    expect(first.decision).toBe("PASS");
    expect(second.decision).toBe("PASS");
    expect(store.writes).toBe(1);
  });
});
