import { beforeEach, describe, expect, it } from "vitest";
import {
  BrokerSessionManager,
  InMemoryMarketDataPort,
  InMemoryRuntimeStateStore,
  RuntimeSupervisor,
  type MarketSessionDescriptor,
  type RuntimeSupervisorDependencies,
} from "../index";

const US_SESSION: MarketSessionDescriptor = {
  market: "US",
  timezone: "America/New_York",
  holidaysUtc: [],
  premarketOpenLocal: "04:00",
  regularOpenLocal: "09:30",
  regularCloseLocal: "16:00",
  afterHoursCloseLocal: "20:00",
};

function buildDeps(
  marketData: InMemoryMarketDataPort,
  stateStore: InMemoryRuntimeStateStore,
): RuntimeSupervisorDependencies {
  return {
    marketData,
    brokerSessions: new BrokerSessionManager({
      async request<T>() {
        return {} as T;
      },
    }),
    stateStore,
    sessions: { US: US_SESSION },
    config: {
      staleAfterMs: 1_000,
      heartbeatIntervalMs: 50_000,
      reconnectBaseDelayMs: 5,
      reconnectMaxDelayMs: 10,
      checkpointEveryEvents: 1,
      checkpointKey: "test-live-market-runtime",
      maxHeartbeatMisses: 3,
    },
  };
}

describe("live market runtime integration", () => {
  beforeEach(() => {
    process.env.LIVE_TRADING_ENABLED = "false";
    process.env.IBKR_READ_ONLY = "true";
  });

  it("emits normalized market events including open/tick/bar/volatility/liquidity", async () => {
    const marketData = new InMemoryMarketDataPort();
    const stateStore = new InMemoryRuntimeStateStore();
    const runtime = new RuntimeSupervisor(buildDeps(marketData, stateStore));
    runtime.addInstrument({
      id: "AAPL",
      symbol: "AAPL",
      market: "US",
      timezone: "America/New_York",
    });

    marketData.pushTicks([
      {
        instrumentId: "AAPL",
        bid: 99.9,
        ask: 100.1,
        last: 100,
        volume: 1000,
        barClosed: true,
        capturedAtUtc: "2026-07-01T14:00:00.000Z",
      },
      {
        instrumentId: "AAPL",
        bid: 102.0,
        ask: 102.5,
        last: 102.2,
        volume: 3000,
        capturedAtUtc: "2026-07-01T14:00:01.000Z",
      },
    ]);

    await runtime.start();
    // Second poll to process second tick batch for volatility/liquidity deltas.
    marketData.pushTicks([
      {
        instrumentId: "AAPL",
        bid: 102.0,
        ask: 102.5,
        last: 102.2,
        volume: 3000,
        capturedAtUtc: "2026-07-01T14:00:01.000Z",
      },
    ]);
    // Re-feed first+second style: push another divergent tick
    marketData.pushTicks([
      {
        instrumentId: "AAPL",
        bid: 110,
        ask: 111,
        last: 110.5,
        volume: 5000,
        capturedAtUtc: "2026-07-01T14:00:02.000Z",
      },
    ]);
    await runtime.pollOnce();
    await runtime.pollOnce();

    const types = runtime.eventBus.listEvents(50).map((event) => event.type);
    expect(types).toContain("BROKER_CONNECTED");
    expect(types).toContain("MARKET_TICK");
    expect(types).toContain("BAR_CLOSE");
    expect(types).toContain("MARKET_OPEN");
    expect(types).toContain("VOLATILITY_SPIKE");
    expect(types).toContain("SIGNAL_CREATED");
    expect(types).toContain("LIQUIDITY_CHANGE");

    runtime.emitNewsReceived({ headline: "Fed speaks" });
    runtime.emitMacroEvent({ name: "CPI" });
    runtime.emitPositionChanged({ symbol: "AAPL", qty: 10 });
    runtime.emitAccountChanged({ equity: 100_000 });
    runtime.emitRiskUpdated({ riskScore: 0.2 });

    const after = runtime.eventBus.listEvents(80).map((event) => event.type);
    expect(after).toContain("NEWS_RECEIVED");
    expect(after).toContain("MACRO_EVENT");
    expect(after).toContain("POSITION_CHANGED");
    expect(after).toContain("ACCOUNT_CHANGED");
    expect(after).toContain("RISK_UPDATED");

    await runtime.stop();
  });

  it("detects stale data and keeps order path blocked", async () => {
    const marketData = new InMemoryMarketDataPort();
    const stateStore = new InMemoryRuntimeStateStore();
    const brokerSessions = new BrokerSessionManager({
      async request<T>() {
        return {} as T;
      },
    });
    const runtime = new RuntimeSupervisor({
      ...buildDeps(marketData, stateStore),
      brokerSessions,
    });
    runtime.addInstrument({
      id: "MSFT",
      symbol: "MSFT",
      market: "US",
      timezone: "America/New_York",
    });

    marketData.pushTicks([
      {
        instrumentId: "MSFT",
        last: 210,
        delayed: true,
        capturedAtUtc: "2026-07-01T14:00:00.000Z",
      },
    ]);

    await runtime.start();
    expect(runtime.isOrderPathBlocked()).toBe(true);
    expect(() => runtime.sendOrder({ symbol: "MSFT" })).toThrow(/ORDER_PATH_BLOCKED/);
    expect(() => brokerSessions.sendOrder({})).toThrow(/ORDER_PATH_BLOCKED/);
    expect(() => brokerSessions.assertNoOrderPath("orders")).toThrow(/order path/i);
    await runtime.stop();
  });

  it("reconnects after stream failure and recovers persisted state", async () => {
    const marketData = new InMemoryMarketDataPort();
    const stateStore = new InMemoryRuntimeStateStore();
    const runtime = new RuntimeSupervisor(buildDeps(marketData, stateStore));
    runtime.addInstrument({
      id: "NVDA",
      symbol: "NVDA",
      market: "US",
      timezone: "America/New_York",
    });

    marketData.pushFailure();
    marketData.pushTicks([
      {
        instrumentId: "NVDA",
        last: 500,
        bid: 499,
        ask: 501,
        capturedAtUtc: "2026-07-01T14:00:00.000Z",
      },
    ]);

    await runtime.start();
    await new Promise((resolve) => setTimeout(resolve, 30));
    await runtime.stop();

    const types = runtime.eventBus.listEvents(40).map((event) => event.type);
    expect(types).toContain("BROKER_DISCONNECTED");
    expect(types).toContain("BROKER_CONNECTED");

    const recovered = new RuntimeSupervisor(buildDeps(new InMemoryMarketDataPort(), stateStore));
    const checkpoint = await recovered.recover();
    expect(checkpoint).not.toBeNull();
    expect(recovered.instruments.list().some((instrument) => instrument.id === "NVDA")).toBe(true);
    expect(recovered.healthSnapshot("2026-07-01T14:00:05.000Z").heartbeatLagMs).toBeGreaterThanOrEqual(0);
  });

  it("persists heartbeat activity and does not mutate trading mode env", async () => {
    const marketData = new InMemoryMarketDataPort();
    const stateStore = new InMemoryRuntimeStateStore();
    const runtime = new RuntimeSupervisor(buildDeps(marketData, stateStore));
    runtime.addInstrument({
      id: "SPY",
      symbol: "SPY",
      market: "US",
      timezone: "America/New_York",
    });
    marketData.pushTicks([
      {
        instrumentId: "SPY",
        last: 500,
        capturedAtUtc: "2026-07-01T14:00:00.000Z",
      },
    ]);

    const beforeLive = process.env.LIVE_TRADING_ENABLED;
    const beforeReadonly = process.env.IBKR_READ_ONLY;

    await runtime.start();
    const health = runtime.healthSnapshot();
    expect(health.lastHeartbeatUtc).not.toBeNull();
    expect(health.streamConnected).toBe(true);
    expect(process.env.LIVE_TRADING_ENABLED).toBe(beforeLive);
    expect(process.env.IBKR_READ_ONLY).toBe(beforeReadonly);
    await runtime.stop();
  });
});
