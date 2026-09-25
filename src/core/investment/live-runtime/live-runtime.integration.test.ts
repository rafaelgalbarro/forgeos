import { beforeEach, describe, expect, it } from "vitest";
import type {
  BrokerEngine,
  BrokerEngineRequest,
} from "@/src/core/application/ports/broker-engine";
import {
  InMemoryRuntimeStateStore,
  LiveMarketRuntimeOrchestrator,
  type LiveRuntimeDependencies,
  type MarketTickPayload,
} from "./index";

class QueueBrokerEngine implements BrokerEngine {
  readonly name = "paper" as const;
  private readonly queue: Array<{ ticks?: MarketTickPayload[]; fail?: boolean }> = [];

  pushTicks(ticks: MarketTickPayload[]): void {
    this.queue.push({ ticks });
  }

  pushFailure(): void {
    this.queue.push({ fail: true });
  }

  async request<T>(_request: BrokerEngineRequest): Promise<T> {
    const next = this.queue.shift() ?? { ticks: [] };
    if (next.fail) throw new Error("stream failure");
    return { ticks: next.ticks ?? [] } as T;
  }
}

function buildDeps(brokerEngine: BrokerEngine, stateStore: InMemoryRuntimeStateStore): LiveRuntimeDependencies {
  return {
    brokerEngine,
    stateStore,
    sessions: {
      US: {
        market: "US",
        timezone: "America/New_York",
        holidaysUtc: [],
        premarketOpenLocal: "04:00",
        regularOpenLocal: "09:30",
        regularCloseLocal: "16:00",
        afterHoursCloseLocal: "20:00",
      },
    },
    config: {
      staleAfterMs: 1_000,
      heartbeatIntervalMs: 1_000,
      reconnectBaseDelayMs: 5,
      reconnectMaxDelayMs: 10,
      checkpointEveryEvents: 1,
      checkpointKey: "test-runtime",
    },
  };
}

describe("live runtime integration", () => {
  beforeEach(() => {
    process.env.LIVE_TRADING_ENABLED = "false";
    process.env.IBKR_READ_ONLY = "true";
  });

  it("emits normalized events and session transitions", async () => {
    const broker = new QueueBrokerEngine();
    const stateStore = new InMemoryRuntimeStateStore();
    const runtime = new LiveMarketRuntimeOrchestrator(buildDeps(broker, stateStore));
    runtime.addInstrument({
      id: "AAPL",
      symbol: "AAPL",
      market: "US",
      timezone: "America/New_York",
    });
    broker.pushTicks([
      {
        instrumentId: "AAPL",
        bid: 99.9,
        ask: 100.1,
        last: 100,
        volume: 1000,
        barClosed: true,
        capturedAtUtc: new Date().toISOString(),
      },
      {
        instrumentId: "AAPL",
        bid: 102.0,
        ask: 102.4,
        last: 102.2,
        volume: 3000,
        capturedAtUtc: new Date().toISOString(),
      },
    ]);

    await runtime.start();
    const types = runtime.eventBus.listEvents(20).map((event) => event.type);
    expect(types).toContain("MARKET_TICK");
    expect(types).toContain("BAR_CLOSED");
    expect(types).toContain("SPREAD_CHANGED");
    expect(types).toContain("VOLUME_SPIKE");
    expect(types).toContain("VOLATILITY_CHANGED");
    expect(types.some((type) => type === "SESSION_OPENED" || type === "SESSION_CLOSED")).toBe(true);
    runtime.stop();
  });

  it("marks stale data and blocks executable signal path", async () => {
    const broker = new QueueBrokerEngine();
    const stateStore = new InMemoryRuntimeStateStore();
    const runtime = new LiveMarketRuntimeOrchestrator(buildDeps(broker, stateStore));
    runtime.addInstrument({
      id: "MSFT",
      symbol: "MSFT",
      market: "US",
      timezone: "America/New_York",
    });

    broker.pushTicks([
      {
        instrumentId: "MSFT",
        last: 210,
        delayed: true,
        capturedAtUtc: "2026-07-01T14:00:00.000Z",
      },
    ]);
    await runtime.start();
    const types = runtime.eventBus.listEvents(10).map((event) => event.type);
    expect(types).toContain("DATA_STALE");
    expect(runtime.isOrderPathBlocked()).toBe(true);
    runtime.stop();
  });

  it("handles reconnect, emits connection events, and recovers state", async () => {
    const broker = new QueueBrokerEngine();
    const stateStore = new InMemoryRuntimeStateStore();
    const runtime = new LiveMarketRuntimeOrchestrator(buildDeps(broker, stateStore));
    runtime.addInstrument({
      id: "NVDA",
      symbol: "NVDA",
      market: "US",
      timezone: "America/New_York",
    });
    broker.pushFailure();
    broker.pushTicks([
      {
        instrumentId: "NVDA",
        last: 500,
        capturedAtUtc: "2026-07-01T14:00:00.000Z",
      },
    ]);
    await runtime.start();
    await new Promise((resolve) => setTimeout(resolve, 20));
    runtime.stop();

    const types = runtime.eventBus.listEvents(20).map((event) => event.type);
    expect(types).toContain("CONNECTION_LOST");
    expect(types).toContain("CONNECTION_RESTORED");

    const recovered = new LiveMarketRuntimeOrchestrator(buildDeps(new QueueBrokerEngine(), stateStore));
    await recovered.recover();
    expect(recovered.instruments.list().some((instrument) => instrument.id === "NVDA")).toBe(true);
    const health = recovered.healthSnapshot("2026-07-01T14:00:05.000Z");
    expect(health.heartbeatLagMs).toBeGreaterThanOrEqual(0);
  });
});
