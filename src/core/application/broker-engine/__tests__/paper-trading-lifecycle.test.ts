import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createPaperBrokerEngine } from "@/lib/broker-engine/paper-broker-engine";

function setTempStore(): string {
  const storePath = path.join(os.tmpdir(), `forgeos-paper-lifecycle-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  process.env.PAPER_TRADING_STORE_PATH = storePath;
  return storePath;
}

afterEach(() => {
  delete process.env.PAPER_TRADING_STORE_PATH;
});

describe("paper trading lifecycle", () => {
  it("handles partial fills, replacement, trailing stop, and cancellation/rejection/expiry", async () => {
    setTempStore();
    const engine = createPaperBrokerEngine();

    const created = await engine.request<{ id: string; status: string }>({
      path: "/api/paper-trading/orders",
      method: "POST",
      body: JSON.stringify({
        signal: { strategy: "breakout" },
        symbol: "MSFT",
        side: "BUY",
        intent: "ENTRY",
        quantity: 10,
        expectedPrice: 100,
        bid: 99.9,
        ask: 100.1,
        sessionTag: "ny-open",
        regimeTag: "trend",
      }),
    });
    expect(created.status).toBe("PENDING");

    const partial = await engine.request<{ order: { status: string; remainingQuantity: number; metrics: { executedPrice: number | null } } }>({
      path: `/api/paper-trading/orders/${created.id}/events`,
      method: "POST",
      body: JSON.stringify({ type: "fill", quantity: 4, price: 100.2, commission: 0.5 }),
    });
    expect(partial.order.status).toBe("PARTIALLY_FILLED");
    expect(partial.order.remainingQuantity).toBe(6);
    expect(partial.order.metrics.executedPrice).not.toBeNull();

    const replaced = await engine.request<{ order: { status: string }; replacementOrder?: { id: string; status: string } }>({
      path: `/api/paper-trading/orders/${created.id}/events`,
      method: "POST",
      body: JSON.stringify({
        type: "replace",
        replacement: { expectedPrice: 99.8, quantity: 6 },
      }),
    });
    expect(replaced.order.status).toBe("REPLACED");
    expect(replaced.replacementOrder?.status).toBe("PENDING");

    const trailing = await engine.request<{ id: string }>({
      path: "/api/paper-trading/orders",
      method: "POST",
      body: JSON.stringify({
        signal: { strategy: "trail-exit" },
        symbol: "MSFT",
        side: "SELL",
        intent: "TRAILING_STOP",
        quantity: 4,
        expectedPrice: 100.5,
        bid: 100.4,
        ask: 100.6,
        trailingOffset: 1,
        sessionTag: "ny-close",
        regimeTag: "range",
      }),
    });

    await engine.request({
      path: `/api/paper-trading/orders/${trailing.id}/events`,
      method: "POST",
      body: JSON.stringify({ type: "mark", markPrice: 103 }),
    });
    const trailingTriggered = await engine.request<{ order: { status: string; metrics: { exitReason: string | null } } }>({
      path: `/api/paper-trading/orders/${trailing.id}/events`,
      method: "POST",
      body: JSON.stringify({ type: "mark", markPrice: 101.8 }),
    });
    expect(trailingTriggered.order.status).toBe("FILLED");
    expect(trailingTriggered.order.metrics.exitReason).toBe("trailing_stop_triggered");

    const canceled = await engine.request<{ id: string }>({
      path: "/api/paper-trading/orders",
      method: "POST",
      body: JSON.stringify({ symbol: "NVDA", side: "BUY", intent: "ENTRY", quantity: 1, expectedPrice: 10 }),
    });
    const canceledResult = await engine.request<{ order: { status: string } }>({
      path: `/api/paper-trading/orders/${canceled.id}/events`,
      method: "POST",
      body: JSON.stringify({ type: "cancel", reason: "manual" }),
    });
    expect(canceledResult.order.status).toBe("CANCELED");

    const rejected = await engine.request<{ id: string }>({
      path: "/api/paper-trading/orders",
      method: "POST",
      body: JSON.stringify({ symbol: "GOOG", side: "BUY", intent: "ENTRY", quantity: 1, expectedPrice: 10 }),
    });
    const rejectedResult = await engine.request<{ order: { status: string } }>({
      path: `/api/paper-trading/orders/${rejected.id}/events`,
      method: "POST",
      body: JSON.stringify({ type: "reject", reason: "risk-rule" }),
    });
    expect(rejectedResult.order.status).toBe("REJECTED");

    const expired = await engine.request<{ id: string }>({
      path: "/api/paper-trading/orders",
      method: "POST",
      body: JSON.stringify({ symbol: "AMZN", side: "BUY", intent: "ENTRY", quantity: 1, expectedPrice: 10 }),
    });
    const expiredResult = await engine.request<{ order: { status: string } }>({
      path: `/api/paper-trading/orders/${expired.id}/events`,
      method: "POST",
      body: JSON.stringify({ type: "expire", reason: "time-in-force" }),
    });
    expect(expiredResult.order.status).toBe("EXPIRED");
  });

  it("reconciles persisted state after restart and generates certification report", async () => {
    const storePath = setTempStore();
    const firstEngine = createPaperBrokerEngine();
    const now = Date.now();

    for (let index = 0; index < 100; index += 1) {
      // Spread closed trades across a full 30-day evaluation window (inclusive).
      const closedAt = new Date(now - ((99 - index) / 99) * 30 * 24 * 60 * 60 * 1000).toISOString();
      const decisionTime = closedAt;
      const sendTime = new Date(new Date(decisionTime).getTime() + 50).toISOString();
      const created = await firstEngine.request<{ id: string }>({
        path: "/api/paper-trading/orders",
        method: "POST",
        body: JSON.stringify({
          signal: { idx: index },
          symbol: "AAPL",
          side: "BUY",
          intent: "ENTRY",
          quantity: 1,
          expectedPrice: 100,
          bid: 99.9,
          ask: 100.1,
          decisionTime,
          sendTime,
          sessionTag: index % 2 === 0 ? "eu-open" : "ny-open",
          regimeTag: index % 2 === 0 ? "trend" : "range",
        }),
      });
      await firstEngine.request({
        path: `/api/paper-trading/orders/${created.id}/events`,
        method: "POST",
        body: JSON.stringify({ type: "fill", quantity: 1, price: 100, at: closedAt }),
      });

      const exit = await firstEngine.request<{ id: string }>({
        path: "/api/paper-trading/orders",
        method: "POST",
        body: JSON.stringify({
          signal: { idx: index, leg: "exit" },
          symbol: "AAPL",
          side: "SELL",
          intent: "EXIT",
          quantity: 1,
          expectedPrice: 101,
          bid: 100.9,
          ask: 101.1,
          decisionTime,
          sendTime,
          sessionTag: index % 2 === 0 ? "eu-open" : "ny-open",
          regimeTag: index % 2 === 0 ? "trend" : "range",
        }),
      });
      await firstEngine.request({
        path: `/api/paper-trading/orders/${exit.id}/events`,
        method: "POST",
        body: JSON.stringify({ type: "fill", quantity: 1, price: 101, reason: "target_hit", at: closedAt }),
      });
    }

    expect(fs.existsSync(storePath)).toBe(true);

    const restartedEngine = createPaperBrokerEngine();
    const state = await restartedEngine.request<{ journal: Array<{ type: string }> }>({
      path: "/api/paper-trading/state",
      method: "GET",
    });
    expect(state.journal.some((event) => event.type === "RECONCILED_AFTER_RESTART")).toBe(true);

    const report = await restartedEngine.request<{
      type: string;
      certified: boolean;
      gates: {
        minimumClosedTrades: { passed: boolean };
        minimumEvaluationDays: { passed: boolean };
        multipleSessions: { passed: boolean };
        multipleRegimes: { passed: boolean };
      };
      closedTrades: unknown[];
    }>({
      path: "/api/paper-trading/certification-report",
      method: "GET",
    });

    expect(report.type).toBe("PaperTradingCertificationReport");
    expect(report.closedTrades.length).toBeGreaterThanOrEqual(100);
    expect(report.gates.minimumClosedTrades.passed).toBe(true);
    expect(report.gates.minimumEvaluationDays.passed).toBe(true);
    expect(report.gates.multipleSessions.passed).toBe(true);
    expect(report.gates.multipleRegimes.passed).toBe(true);
    expect(report.certified).toBe(true);
  }, 60_000);
});
