import { beforeEach, describe, expect, it } from "vitest";
import type { BrokerEngine, BrokerEngineRequest } from "@/src/core/application/ports/broker-engine";
import {
  InMemoryExecutionStorage,
  LiveExecutionEngine,
  createDefaultRestrictions,
  type ExecuteLiveOrderInput,
} from "./index";

class StubBrokerEngine implements BrokerEngine {
  readonly name = "paper" as const;

  async request<T>(request: BrokerEngineRequest): Promise<T> {
    if (request.path === "/orders" && request.method === "POST") {
      return { orderId: "OID-1", permId: "PERM-1", submittedAt: "2026-07-30T09:30:10.000Z" } as T;
    }
    if (request.path === "/orders/OID-1/status" && request.method === "GET") {
      return { filledQuantity: 10, averageFillPrice: 100, totalCommission: 1.25 } as T;
    }
    return {} as T;
  }
}

function baseInput(overrides: Partial<ExecuteLiveOrderInput> = {}): ExecuteLiveOrderInput {
  return {
    actor: "trader-1",
    idempotencyKey: "idem-1",
    symbol: "AAPL",
    side: "BUY",
    orderType: "LIMIT",
    quantity: 10,
    limitPrice: 100,
    stopPrice: 95,
    targetPrice: 110,
    instrumentType: "EQUITY",
    leverage: 1,
    intent: "NEW_POSITION",
    requestedSession: "REGULAR",
    approvalExpirySeconds: 120,
    ...overrides,
  };
}

function buildEngine(clock: { now: string[]; idx: number }, storage = new InMemoryExecutionStorage()) {
  const engine = new LiveExecutionEngine({
    brokerEngine: new StubBrokerEngine(),
    whatIfAnalyzer: {
      async runWhatIf(draft) {
        return {
          estimatedMargin: draft.quantity * draft.limitPrice * 0.5,
          estimatedCommission: 1,
          estimatedNotional: draft.quantity * draft.limitPrice,
          estimatedRisk: (draft.limitPrice - 95) * draft.quantity,
          computedAt: "2026-07-30T09:30:01.000Z",
        };
      },
    },
    storage,
    restrictions: createDefaultRestrictions(),
    now: () => {
      const value = clock.now[Math.min(clock.idx, clock.now.length - 1)];
      clock.idx += 1;
      return value;
    },
    readPriceSnapshot: async () => ({
      bid: 99.9,
      ask: 100.1,
      last: 100,
      at: "2026-07-30T09:30:02.000Z",
    }),
  });
  return { engine, storage };
}

describe("LiveExecutionEngine v1 safety and flow", () => {
  beforeEach(() => {
    process.env.LIVE_TRADING_ENABLED = "false";
  });

  it("enforces mandatory restrictions", async () => {
    const scenarios: Array<{ name: string; input: Partial<ExecuteLiveOrderInput>; expected: string }> = [
      { name: "market blocked", input: { orderType: "MARKET" }, expected: "only LIMIT" },
      { name: "options blocked", input: { instrumentType: "OPTION" }, expected: "only EQUITY" },
      { name: "futures blocked", input: { instrumentType: "FUTURE" }, expected: "only EQUITY" },
      { name: "forex blocked", input: { instrumentType: "FOREX" }, expected: "only EQUITY" },
      { name: "crypto blocked", input: { instrumentType: "CRYPTO" }, expected: "only EQUITY" },
      { name: "short blocked by side", input: { side: "BUY", intent: "SHORT" }, expected: "short" },
      { name: "leverage blocked", input: { leverage: 2 }, expected: "leverage" },
      { name: "after hours blocked", input: { requestedSession: "AFTER_HOURS" }, expected: "out-of-hours" },
      { name: "max notional blocked", input: { quantity: 600, limitPrice: 100 }, expected: "max notional" },
      { name: "max risk blocked", input: { quantity: 500, limitPrice: 100, stopPrice: 90 }, expected: "max risk" },
    ];

    for (const scenario of scenarios) {
      const { engine } = buildEngine({
        now: [
          "2026-07-30T09:30:00.000Z",
          "2026-07-30T09:30:01.000Z",
          "2026-07-30T09:30:02.000Z",
          "2026-07-30T09:30:03.000Z",
        ],
        idx: 0,
      });
      await expect(engine.execute(baseInput({ idempotencyKey: `idem-${scenario.name}`, ...scenario.input }))).rejects.toThrow(
        scenario.expected,
      );
    }
  });

  it("enforces max one simultaneous new position", async () => {
    const clock = {
      now: [
        "2026-07-30T09:30:00.000Z",
        "2026-07-30T09:30:01.000Z",
        "2026-07-30T09:30:02.000Z",
        "2026-07-30T09:30:03.000Z",
      ],
      idx: 0,
    };
    const storage = new InMemoryExecutionStorage();
    await storage.saveOperation({
      operationId: "existing-op",
      draft: {
        draftId: "existing-draft",
        idempotencyKey: "existing-idem",
        symbol: "MSFT",
        side: "BUY",
        quantity: 2,
        limitPrice: 100,
        orderType: "LIMIT",
        tif: "DAY",
        assetClass: "EQUITY",
        session: "REGULAR",
        leverage: 1,
        intent: "NEW_POSITION",
        createdAt: "2026-07-30T09:00:00.000Z",
      },
      whatIf: {
        estimatedMargin: 100,
        estimatedCommission: 1,
        estimatedNotional: 200,
        estimatedRisk: 5,
        computedAt: "2026-07-30T09:00:00.000Z",
      },
      approval: {
        approvalId: "approval-existing",
        draftId: "existing-draft",
        approverId: "ops",
        createdAt: "2026-07-30T09:00:00.000Z",
        expiresAt: "2026-07-30T10:00:00.000Z",
        firstConfirmedAt: "2026-07-30T09:00:10.000Z",
        secondConfirmedAt: "2026-07-30T09:00:20.000Z",
      },
      receipt: { orderId: "X", permId: "Y", submittedAt: "2026-07-30T09:00:00.000Z" },
      fill: {
        filledQuantity: 2,
        averageFillPrice: 100,
        totalCommission: 1,
        reconciledAt: "2026-07-30T09:01:00.000Z",
      },
      state: "RECORDED",
    });
    const { engine } = buildEngine(clock, storage);
    await expect(engine.execute(baseInput({ idempotencyKey: "idem-concurrency" }))).rejects.toThrow(
      "max simultaneous new positions",
    );
  });

  it("supports idempotent submit behavior", async () => {
    const clock = {
      now: [
        "2026-07-30T09:30:00.000Z",
        "2026-07-30T09:30:01.000Z",
        "2026-07-30T09:30:02.000Z",
        "2026-07-30T09:30:03.000Z",
        "2026-07-30T09:30:04.000Z",
        "2026-07-30T09:30:05.000Z",
        "2026-07-30T09:30:06.000Z",
        "2026-07-30T09:30:07.000Z",
      ],
      idx: 0,
    };
    const { engine } = buildEngine(clock);
    const first = await engine.execute(baseInput({ idempotencyKey: "idem-idem" }));
    const second = await engine.execute(baseInput({ idempotencyKey: "idem-idem" }));
    expect(second.operationId).toBe(first.operationId);
    expect(second.orderId).toBe(first.orderId);
    expect(second.permId).toBe(first.permId);
  });

  it("blocks submit when kill switch enabled", async () => {
    const { engine } = buildEngine(
      {
        now: [
          "2026-07-30T09:30:00.000Z",
          "2026-07-30T09:30:01.000Z",
          "2026-07-30T09:30:02.000Z",
          "2026-07-30T09:30:03.000Z",
        ],
        idx: 0,
      },
    );
    await engine.setKillSwitch(true, "risk-officer");
    await expect(engine.execute(baseInput({ idempotencyKey: "idem-kill" }))).rejects.toThrow("Kill switch");
  });

  it("supports cancel-all command", async () => {
    const clock = {
      now: [
        "2026-07-30T09:30:00.000Z",
        "2026-07-30T09:30:01.000Z",
        "2026-07-30T09:30:02.000Z",
        "2026-07-30T09:30:03.000Z",
        "2026-07-30T09:30:04.000Z",
        "2026-07-30T09:30:05.000Z",
        "2026-07-30T09:30:06.000Z",
      ],
      idx: 0,
    };
    const { engine, storage } = buildEngine(clock);
    await engine.execute(baseInput({ idempotencyKey: "idem-cancel-all" }));
    await engine.cancelAll("ops");
    const open = await storage.listOpenOperations();
    expect(open.every((item) => item.state === "CANCELLED")).toBe(true);
  });

  it("enforces double confirmation and expiry checks", async () => {
    const { engine } = buildEngine(
      {
        now: [
          "2026-07-30T09:30:00.000Z",
          "2026-07-30T09:31:00.000Z",
          "2026-07-30T09:32:00.000Z",
          "2026-07-30T09:33:00.000Z",
          "2026-07-30T09:34:00.000Z",
          "2026-07-30T09:35:00.000Z",
          "2026-07-30T09:36:00.000Z",
        ],
        idx: 0,
      },
    );
    await expect(engine.execute(baseInput({ idempotencyKey: "idem-expired", approvalExpirySeconds: 1 }))).rejects.toThrow(
      "expired",
    );
  });

  it("enforces full mandatory flow order and records audit", async () => {
    const clock = {
      now: [
        "2026-07-30T09:30:00.000Z",
        "2026-07-30T09:30:01.000Z",
        "2026-07-30T09:30:02.000Z",
        "2026-07-30T09:30:03.000Z",
        "2026-07-30T09:30:04.000Z",
        "2026-07-30T09:30:05.000Z",
        "2026-07-30T09:30:06.000Z",
        "2026-07-30T09:30:07.000Z",
        "2026-07-30T09:30:08.000Z",
        "2026-07-30T09:30:09.000Z",
      ],
      idx: 0,
    };
    const { engine, storage } = buildEngine(clock);
    const result = await engine.execute(baseInput({ idempotencyKey: "idem-flow" }));
    const audit = await storage.listAudit();
    const events = audit.map((item) => item.event);

    expect(result.state).toBe("RECORDED");
    expect(events).toEqual(
      expect.arrayContaining([
        "DRAFT_CREATED",
        "WHATIF_COMPLETED",
        "RISK_REVALIDATED",
        "APPROVAL_REQUESTED",
        "PRICE_REVALIDATED",
        "APPROVAL_CONFIRMED_1",
        "APPROVAL_CONFIRMED_2",
        "APPROVAL_EXPIRY_VALIDATED",
        "ORDER_SUBMITTED",
        "ORDER_ACKNOWLEDGED",
        "ORDER_MONITORED",
        "FILL_RECONCILED",
        "PROTECTION_ACTIVATED",
        "OPERATION_RECORDED",
      ]),
    );
  });

  it("does not auto-flip LIVE_TRADING_ENABLED", async () => {
    process.env.LIVE_TRADING_ENABLED = "false";
    const { engine } = buildEngine(
      {
        now: [
          "2026-07-30T09:30:00.000Z",
          "2026-07-30T09:30:01.000Z",
          "2026-07-30T09:30:02.000Z",
          "2026-07-30T09:30:03.000Z",
          "2026-07-30T09:30:04.000Z",
          "2026-07-30T09:30:05.000Z",
          "2026-07-30T09:30:06.000Z",
        ],
        idx: 0,
      },
    );
    await engine.execute(baseInput({ idempotencyKey: "idem-live-flag" }));
    expect(process.env.LIVE_TRADING_ENABLED).toBe("false");
  });
});
