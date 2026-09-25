import { describe, expect, it } from "vitest";
import type { BrokerEngine } from "@/src/core/application/ports/broker-engine";
import {
  InMemoryExitOrderRegistry,
  InMemoryPositionEventLog,
  InMemoryPositionStateRepository,
  PositionManagerService,
  assertPositionTransition,
  ensureExitDecision,
  type BrokerPositionAdapter,
  type EvaluationSignal,
  type PositionEvaluator,
  type PositionSnapshot,
} from "../index";

class StubBrokerEngine implements BrokerEngine {
  readonly name = "future" as const;
  async request<T>(): Promise<T> {
    return [] as T;
  }
}

class FixedBrokerAdapter implements BrokerPositionAdapter {
  constructor(private readonly positions: { positionId: string; symbol: string; quantity: number; averagePrice: number }[]) {}
  async fetchOpenPositions() {
    return this.positions.map((position) => ({ ...position, source: "BROKER" as const }));
  }
}

function buildPosition(partial?: Partial<PositionSnapshot>): PositionSnapshot {
  return {
    positionId: partial?.positionId ?? "pos-1",
    symbol: partial?.symbol ?? "NVDA",
    state: partial?.state ?? "OPEN",
    origin: partial?.origin ?? "STRATEGY",
    quantity: partial?.quantity ?? 100,
    averagePrice: partial?.averagePrice ?? 100,
    openedAt: partial?.openedAt ?? "2026-07-30T09:00:00.000Z",
    updatedAt: partial?.updatedAt ?? "2026-07-30T09:00:00.000Z",
    reconciliationStatus: partial?.reconciliationStatus ?? "OK",
    pendingExitOrderId: partial?.pendingExitOrderId,
    fills: partial?.fills ?? [],
    metadata: partial?.metadata,
  };
}

function signal(reason: EvaluationSignal["reason"], urgency: EvaluationSignal["urgency"]): EvaluationSignal {
  return {
    reason,
    triggered: true,
    urgency,
    evidence: [`${reason} triggered`],
  };
}

describe("PositionManagerService", () => {
  it("applies valid transition rules", () => {
    expect(() => assertPositionTransition({ from: "OPEN", to: "EXIT_PENDING" })).not.toThrow();
    expect(() => assertPositionTransition({ from: "CLOSED", to: "OPEN" })).toThrow(/Invalid position transition/);
  });

  it("prioritizes emergency exits over non-emergency exits", async () => {
    const repository = new InMemoryPositionStateRepository();
    await repository.upsert(buildPosition());
    const evaluators: PositionEvaluator[] = [
      { type: "TAKE_PROFIT", async evaluate() { return signal("TAKE_PROFIT", "LOW"); } },
      { type: "CRITICAL_NEWS", async evaluate() { return signal("CRITICAL_NEWS", "HIGH"); } },
    ];
    const service = new PositionManagerService({
      repository,
      eventLog: new InMemoryPositionEventLog(),
      exitOrderRegistry: new InMemoryExitOrderRegistry(),
      brokerAdapter: new FixedBrokerAdapter([]),
      brokerEngine: new StubBrokerEngine(),
      evaluators,
      manualPolicy: { allowAutomatedExits: false, allowStateMutation: false },
      now: () => "2026-07-30T10:00:00.000Z",
    });

    const decision = await service.evaluatePosition("pos-1");
    expect(decision?.reason).toBe("CRITICAL_NEWS");
    expect(decision?.urgency).toBe("EMERGENCY");
  });

  it("suppresses duplicate exit orders for a position", async () => {
    const repository = new InMemoryPositionStateRepository();
    const registry = new InMemoryExitOrderRegistry();
    await repository.upsert(buildPosition());
    await registry.save({
      orderId: "exit-1",
      positionId: "pos-1",
      reason: "STOP_LOSS",
      quantity: 100,
      status: "PENDING",
      submittedAt: "2026-07-30T10:00:00.000Z",
    });

    const service = new PositionManagerService({
      repository,
      eventLog: new InMemoryPositionEventLog(),
      exitOrderRegistry: registry,
      brokerAdapter: new FixedBrokerAdapter([]),
      brokerEngine: new StubBrokerEngine(),
      evaluators: [{ type: "STOP_LOSS", async evaluate() { return signal("STOP_LOSS", "HIGH"); } }],
      manualPolicy: { allowAutomatedExits: true, allowStateMutation: true },
      now: () => "2026-07-30T10:00:00.000Z",
    });

    const decision = await service.evaluatePosition("pos-1");
    expect(decision).toBeNull();
  });

  it("detects partial fills and moves state to REDUCING", async () => {
    const repository = new InMemoryPositionStateRepository();
    await repository.upsert(buildPosition({ quantity: 100 }));
    const service = new PositionManagerService({
      repository,
      eventLog: new InMemoryPositionEventLog(),
      exitOrderRegistry: new InMemoryExitOrderRegistry(),
      brokerAdapter: new FixedBrokerAdapter([]),
      brokerEngine: new StubBrokerEngine(),
      evaluators: [],
      manualPolicy: { allowAutomatedExits: true, allowStateMutation: true },
      now: () => "2026-07-30T10:00:00.000Z",
    });

    await service.registerFill("pos-1", {
      fillId: "fill-1",
      quantity: 40,
      price: 99,
      at: "2026-07-30T10:05:00.000Z",
    });

    const updated = await repository.getById("pos-1");
    expect(updated?.state).toBe("REDUCING");
    expect(updated?.quantity).toBe(60);
  });

  it("marks reconciliation required and blocks entries on mismatch", async () => {
    const repository = new InMemoryPositionStateRepository();
    await repository.upsert(buildPosition({ positionId: "local-only", quantity: 50 }));
    const service = new PositionManagerService({
      repository,
      eventLog: new InMemoryPositionEventLog(),
      exitOrderRegistry: new InMemoryExitOrderRegistry(),
      brokerAdapter: new FixedBrokerAdapter([{ positionId: "broker-only", symbol: "MSFT", quantity: 20, averagePrice: 300 }]),
      brokerEngine: new StubBrokerEngine(),
      evaluators: [],
      manualPolicy: { allowAutomatedExits: true, allowStateMutation: true },
      now: () => "2026-07-30T10:00:00.000Z",
    });

    const reconciliation = await service.reconcile();
    const gate = await service.getEntryBlockStatus();

    expect(reconciliation.status).toBe("RECONCILIATION_REQUIRED");
    expect(gate.blocked).toBe(true);
    expect(gate.status).toBe("RECONCILIATION_REQUIRED");
  });

  it("enforces manual position policy restrictions", async () => {
    const repository = new InMemoryPositionStateRepository();
    const manual = buildPosition({ positionId: "manual-1", origin: "MANUAL" });
    await repository.upsert(manual);
    const service = new PositionManagerService({
      repository,
      eventLog: new InMemoryPositionEventLog(),
      exitOrderRegistry: new InMemoryExitOrderRegistry(),
      brokerAdapter: new FixedBrokerAdapter([]),
      brokerEngine: new StubBrokerEngine(),
      evaluators: [{ type: "STOP_LOSS", async evaluate() { return signal("STOP_LOSS", "HIGH"); } }],
      manualPolicy: { allowAutomatedExits: false, allowStateMutation: false },
      now: () => "2026-07-30T10:00:00.000Z",
    });

    const decision = await service.evaluatePosition("manual-1");
    await service.syncManualPosition(manual);
    const updated = await repository.getById("manual-1");

    expect(decision).toBeNull();
    expect(updated?.state).toBe("MANUAL_INTERVENTION");
    expect(updated?.reconciliationStatus).toBe("RECONCILIATION_REQUIRED");
  });

  it("keeps ExitDecision JSON serializable", () => {
    const decision = ensureExitDecision({
      positionId: "pos-7",
      reason: "STOP_LOSS",
      urgency: "HIGH",
      quantity: 12,
      orderType: "MARKET",
      expectedSlippage: 0.5,
      evidence: ["Stop threshold breached"],
      generatedAt: "2026-07-30T10:00:00.000Z",
      expiresAt: "2026-07-30T10:01:00.000Z",
    });
    const parsed = JSON.parse(JSON.stringify(decision)) as typeof decision;
    expect(parsed.positionId).toBe("pos-7");
    expect(parsed.reason).toBe("STOP_LOSS");
    expect(parsed.quantity).toBe(12);
  });
});

