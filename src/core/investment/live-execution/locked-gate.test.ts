import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_LOCKED_RESTRICTIONS,
  InMemoryExecutionStorage,
  reconcileSnapshots,
  runSupervisedLockedPipeline,
  simulateCancelAllAudit,
  type ExecuteLiveOrderInput,
} from "./index";

function baseInput(overrides: Partial<ExecuteLiveOrderInput> = {}): ExecuteLiveOrderInput {
  return {
    actor: "cert-officer",
    idempotencyKey: "locked-idem-1",
    symbol: "AAPL",
    side: "BUY",
    orderType: "LIMIT",
    quantity: 1,
    limitPrice: 50,
    stopPrice: 45,
    targetPrice: 55,
    instrumentType: "EQUITY",
    leverage: 1,
    intent: "NEW_POSITION",
    requestedSession: "REGULAR",
    approvalExpirySeconds: 120,
    ...overrides,
  };
}

describe("SUPERVISED_LOCKED certification gate", () => {
  beforeEach(() => {
    process.env.LIVE_TRADING_ENABLED = "false";
    process.env.IBKR_READ_ONLY = "true";
  });

  it("runs what-if + approval then blocks without placeOrder", async () => {
    const storage = new InMemoryExecutionStorage();
    const clock = [
      "2026-08-03T10:00:00.000Z",
      "2026-08-03T10:00:01.000Z",
      "2026-08-03T10:00:02.000Z",
      "2026-08-03T10:00:03.000Z",
    ];
    let idx = 0;
    const result = await runSupervisedLockedPipeline({
      input: baseInput(),
      storage,
      brokerConnected: true,
      now: () => clock[Math.min(idx++, clock.length - 1)]!,
      price: { bid: 49.9, ask: 50.1, last: 50, at: "2026-08-03T10:00:00.000Z" },
    });
    expect(result.state).toBe("BLOCKED");
    expect(result.placeOrderInvoked).toBe(false);
    expect(result.whatIf.estimatedNotional).toBe(50);
    expect(result.liveTradingEnabled).toBe("false");
    expect(result.ibkrReadOnly).toBe("true");
    const audit = await storage.listAudit();
    expect(audit.map((e) => e.event)).toEqual(
      expect.arrayContaining(["DRAFT_CREATED", "WHATIF_COMPLETED", "APPROVAL_CONFIRMED_2", "BLOCKED"]),
    );
    expect(audit.some((e) => e.event === "ORDER_SUBMITTED")).toBe(false);
  });

  it("rejects disallowed symbol", async () => {
    const storage = new InMemoryExecutionStorage();
    await expect(
      runSupervisedLockedPipeline({
        input: baseInput({ symbol: "TSLA", idempotencyKey: "disallowed" }),
        storage,
        brokerConnected: true,
        now: () => "2026-08-03T10:00:00.000Z",
        price: { bid: 49.9, ask: 50.1, last: 50, at: "2026-08-03T10:00:00.000Z" },
      }),
    ).rejects.toThrow(/Disallowed symbol/);
  });

  it("rejects excessive notional", async () => {
    const storage = new InMemoryExecutionStorage();
    await expect(
      runSupervisedLockedPipeline({
        input: baseInput({ quantity: 5, limitPrice: 50, idempotencyKey: "notional" }),
        storage,
        restrictions: DEFAULT_LOCKED_RESTRICTIONS,
        brokerConnected: true,
        now: () => "2026-08-03T10:00:00.000Z",
        price: { bid: 49.9, ask: 50.1, last: 50, at: "2026-08-03T10:00:00.000Z" },
      }),
    ).rejects.toThrow(/Excessive notional/);
  });

  it("rejects stale market data", async () => {
    const storage = new InMemoryExecutionStorage();
    await expect(
      runSupervisedLockedPipeline({
        input: baseInput({ idempotencyKey: "stale" }),
        storage,
        brokerConnected: true,
        now: () => "2026-08-03T10:05:00.000Z",
        price: { bid: 49.9, ask: 50.1, last: 50, at: "2026-08-03T10:00:00.000Z" },
      }),
    ).rejects.toThrow(/Stale market data/);
  });

  it("rejects when IBKR disconnected", async () => {
    const storage = new InMemoryExecutionStorage();
    await expect(
      runSupervisedLockedPipeline({
        input: baseInput({ idempotencyKey: "disc" }),
        storage,
        brokerConnected: false,
        now: () => "2026-08-03T10:00:00.000Z",
        price: { bid: 49.9, ask: 50.1, last: 50, at: "2026-08-03T10:00:00.000Z" },
      }),
    ).rejects.toThrow(/IBKR disconnected/);
  });

  it("rejects when emergency/kill switch enabled", async () => {
    const storage = new InMemoryExecutionStorage();
    await expect(
      runSupervisedLockedPipeline({
        input: baseInput({ idempotencyKey: "kill" }),
        storage,
        brokerConnected: true,
        killSwitchEnabled: true,
        now: () => "2026-08-03T10:00:00.000Z",
        price: { bid: 49.9, ask: 50.1, last: 50, at: "2026-08-03T10:00:00.000Z" },
      }),
    ).rejects.toThrow(/Kill switch|emergency/);
  });

  it("rejects expired approval", async () => {
    const storage = new InMemoryExecutionStorage();
    const clock = ["2026-08-03T10:00:00.000Z", "2026-08-03T10:10:00.000Z", "2026-08-03T10:10:01.000Z"];
    let idx = 0;
    await expect(
      runSupervisedLockedPipeline({
        input: baseInput({ idempotencyKey: "expiry", approvalExpirySeconds: 1 }),
        storage,
        brokerConnected: true,
        now: () => clock[Math.min(idx++, clock.length - 1)]!,
        price: { bid: 49.9, ask: 50.1, last: 50, at: "2026-08-03T10:00:00.000Z" },
      }),
    ).rejects.toThrow(/expired/);
  });

  it("simulates cancel and reconciliation helpers", () => {
    const cancel = simulateCancelAllAudit("ops");
    expect(cancel.event).toBe("CANCEL_ALL_TRIGGERED");
    expect(cancel.details.placeOrderInvoked).toBe(false);
    const recon = reconcileSnapshots({ orders: [] }, { orders: [] });
    expect(recon.unchanged).toBe(true);
  });

  it("never flips safety flags", async () => {
    const storage = new InMemoryExecutionStorage();
    await runSupervisedLockedPipeline({
      input: baseInput({ idempotencyKey: "flags" }),
      storage,
      brokerConnected: true,
      now: () => "2026-08-03T10:00:00.000Z",
      price: { bid: 49.9, ask: 50.1, last: 50, at: "2026-08-03T10:00:00.000Z" },
    });
    expect(process.env.LIVE_TRADING_ENABLED).toBe("false");
    expect(process.env.IBKR_READ_ONLY).toBe("true");
  });
});
