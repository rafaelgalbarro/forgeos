import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { BrokerEngine, BrokerEngineRequest } from "@/src/core/application/ports/broker-engine";
import {
  BrokerSessionManager,
  CircuitBreaker,
  EmergencyStop,
  HealthMonitor,
  JobScheduler,
  MetricsRegistry,
  NotificationEngine,
  PersistentRuntimeStateStore,
  ReconciliationEngine,
  RuntimeSupervisor,
  StateRecovery,
  StructuredRuntimeLogger,
  TokenBucketRateLimiter,
  type LiveRuntimeAdapter,
} from "./index";

class MemoryAlertSink {
  readonly alerts: Array<{ event: string; reason?: string }> = [];

  async send(alert: { event: string; reason?: string }): Promise<void> {
    this.alerts.push(alert);
  }
}

class RecordingBroker implements BrokerEngine {
  readonly name = "paper" as const;
  readonly paths: string[] = [];
  failOrders = false;

  async request<T>(request: BrokerEngineRequest): Promise<T> {
    this.paths.push(`${request.method}:${request.path}`);
    if (this.failOrders && request.path.includes("/orders")) {
      throw new Error("order request failed");
    }
    return {} as T;
  }
}

class StubLiveRuntime implements LiveRuntimeAdapter {
  recovered = 0;
  started = 0;
  stopped = 0;
  snapshot = { heartbeatLagMs: 0, streamConnected: true, staleRuntime: false };

  async recover(): Promise<void> {
    this.recovered += 1;
  }
  async start(): Promise<void> {
    this.started += 1;
  }
  stop(): void {
    this.stopped += 1;
  }
  healthSnapshot(): { heartbeatLagMs: number; streamConnected: boolean; staleRuntime: boolean } {
    return this.snapshot;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("runtime-os", () => {
  beforeEach(() => {
    process.env.LIVE_TRADING_ENABLED = "false";
  });

  it("recovers state and starts runtime", async () => {
    const live = new StubLiveRuntime();
    const broker = new RecordingBroker();
    const metrics = new MetricsRegistry();
    const scheduler = new JobScheduler();
    const sink = new MemoryAlertSink();
    const store = new PersistentRuntimeStateStore(
      path.join(os.tmpdir(), `runtime-os-${Date.now()}-checkpoint.json`),
      path.join(os.tmpdir(), `runtime-os-${Date.now()}-audits`),
    );
    const supervisor = new RuntimeSupervisor({
      liveRuntime: live,
      brokerSessions: new BrokerSessionManager(
        broker,
        new TokenBucketRateLimiter(40),
        metrics,
        new StructuredRuntimeLogger("runtime-os-test"),
      ),
      healthMonitor: new HealthMonitor(),
      scheduler,
      reconciliation: new ReconciliationEngine(1),
      emergencyStop: new EmergencyStop(),
      circuitBreaker: new CircuitBreaker({
        "daily-loss": 100,
        "consecutive-errors": 2,
        "elevated-latency": 2000,
        "stale-data": 1,
        "connection-loss": 1,
        "too-many-rejects": 5,
        "abnormal-slippage": 100,
        "portfolio-divergence": 2,
        "message-flood": 45,
        "strategy-anomalies": 1,
      }),
      stateRecovery: new StateRecovery(store),
      reconciliationProvider: async () => ({
        brokerOrders: [],
        brokerPositions: [],
        expectedOrders: [],
        expectedPositions: [],
        portfolioDivergencePct: 0,
      }),
      logger: new StructuredRuntimeLogger("runtime-os-test"),
      metrics,
      notifications: new NotificationEngine([sink]),
      config: {
        enableAutoLive: false,
        queueDrainIntervalMs: 10,
        reconciliationIntervalMs: 15,
        watchdogIntervalMs: 10,
      },
      reconnectBrokerSession: async () => true,
    });

    await supervisor.start();
    expect(live.recovered).toBe(1);
    expect(live.started).toBe(1);
    await supervisor.stop();
  });

  it("halts on unknown orders and positions", async () => {
    const live = new StubLiveRuntime();
    const broker = new RecordingBroker();
    const metrics = new MetricsRegistry();
    const scheduler = new JobScheduler();
    const sink = new MemoryAlertSink();
    const store = new PersistentRuntimeStateStore(
      path.join(os.tmpdir(), `runtime-os-${Date.now()}-checkpoint.json`),
      path.join(os.tmpdir(), `runtime-os-${Date.now()}-audits`),
    );
    const supervisor = new RuntimeSupervisor({
      liveRuntime: live,
      brokerSessions: new BrokerSessionManager(
        broker,
        new TokenBucketRateLimiter(40),
        metrics,
        new StructuredRuntimeLogger("runtime-os-test"),
      ),
      healthMonitor: new HealthMonitor(),
      scheduler,
      reconciliation: new ReconciliationEngine(1),
      emergencyStop: new EmergencyStop(),
      circuitBreaker: new CircuitBreaker({
        "daily-loss": 100,
        "consecutive-errors": 2,
        "elevated-latency": 2000,
        "stale-data": 1,
        "connection-loss": 1,
        "too-many-rejects": 5,
        "abnormal-slippage": 100,
        "portfolio-divergence": 2,
        "message-flood": 45,
        "strategy-anomalies": 1,
      }),
      stateRecovery: new StateRecovery(store),
      reconciliationProvider: async () => ({
        brokerOrders: [{ orderId: "ghost", symbol: "AAPL", quantity: 1, side: "BUY" }],
        brokerPositions: [{ symbol: "AAPL", quantity: 10 }],
        expectedOrders: [],
        expectedPositions: [],
        portfolioDivergencePct: 5,
      }),
      logger: new StructuredRuntimeLogger("runtime-os-test"),
      metrics,
      notifications: new NotificationEngine([sink]),
      config: {
        queueDrainIntervalMs: 10,
        reconciliationIntervalMs: 10,
        watchdogIntervalMs: 25,
      },
      reconnectBrokerSession: async () => true,
    });

    await supervisor.start();
    await sleep(30);
    expect(supervisor.isBlocked()).toBe(true);
    expect(supervisor.haltReason()).toBe("HALT_SYSTEM");
  });

  it("halts system on ambiguous failed orders", async () => {
    const live = new StubLiveRuntime();
    const broker = new RecordingBroker();
    broker.failOrders = true;
    const metrics = new MetricsRegistry();
    const scheduler = new JobScheduler();
    const sink = new MemoryAlertSink();
    const store = new PersistentRuntimeStateStore(
      path.join(os.tmpdir(), `runtime-os-${Date.now()}-checkpoint.json`),
      path.join(os.tmpdir(), `runtime-os-${Date.now()}-audits`),
    );
    const sessions = new BrokerSessionManager(
      broker,
      new TokenBucketRateLimiter(40),
      metrics,
      new StructuredRuntimeLogger("runtime-os-test"),
    );
    const supervisor = new RuntimeSupervisor({
      liveRuntime: live,
      brokerSessions: sessions,
      healthMonitor: new HealthMonitor(),
      scheduler,
      reconciliation: new ReconciliationEngine(1),
      emergencyStop: new EmergencyStop(),
      circuitBreaker: new CircuitBreaker({
        "daily-loss": 100,
        "consecutive-errors": 2,
        "elevated-latency": 2000,
        "stale-data": 1,
        "connection-loss": 1,
        "too-many-rejects": 5,
        "abnormal-slippage": 100,
        "portfolio-divergence": 2,
        "message-flood": 45,
        "strategy-anomalies": 1,
      }),
      stateRecovery: new StateRecovery(store),
      reconciliationProvider: async () => ({
        brokerOrders: [],
        brokerPositions: [],
        expectedOrders: [],
        expectedPositions: [],
        portfolioDivergencePct: 0,
      }),
      logger: new StructuredRuntimeLogger("runtime-os-test"),
      metrics,
      notifications: new NotificationEngine([sink]),
      config: {
        queueDrainIntervalMs: 10,
        reconciliationIntervalMs: 30,
        watchdogIntervalMs: 10,
      },
      reconnectBrokerSession: async () => true,
    });

    await supervisor.start();
    void sessions.enqueue("orders", { method: "POST", path: "/orders", body: "{}" }).catch(() => undefined);
    await sleep(40);
    expect(supervisor.haltReason()).toBe("HALT_SYSTEM");
    expect(supervisor.isBlocked()).toBe(true);
  });

  it("reconnects broker session before halting", async () => {
    const live = new StubLiveRuntime();
    live.snapshot = { heartbeatLagMs: 0, streamConnected: false, staleRuntime: false };
    const broker = new RecordingBroker();
    const metrics = new MetricsRegistry();
    const scheduler = new JobScheduler();
    const sink = new MemoryAlertSink();
    const store = new PersistentRuntimeStateStore(
      path.join(os.tmpdir(), `runtime-os-${Date.now()}-checkpoint.json`),
      path.join(os.tmpdir(), `runtime-os-${Date.now()}-audits`),
    );
    const sessions = new BrokerSessionManager(
      broker,
      new TokenBucketRateLimiter(40),
      metrics,
      new StructuredRuntimeLogger("runtime-os-test"),
    );
    sessions.markConnection(false);
    let reconnectCalls = 0;
    const supervisor = new RuntimeSupervisor({
      liveRuntime: live,
      brokerSessions: sessions,
      healthMonitor: new HealthMonitor(),
      scheduler,
      reconciliation: new ReconciliationEngine(1),
      emergencyStop: new EmergencyStop(),
      circuitBreaker: new CircuitBreaker({
        "daily-loss": 100,
        "consecutive-errors": 2,
        "elevated-latency": 2000,
        "stale-data": 1,
        "connection-loss": 1,
        "too-many-rejects": 5,
        "abnormal-slippage": 100,
        "portfolio-divergence": 2,
        "message-flood": 45,
        "strategy-anomalies": 1,
      }),
      stateRecovery: new StateRecovery(store),
      reconciliationProvider: async () => ({
        brokerOrders: [],
        brokerPositions: [],
        expectedOrders: [],
        expectedPositions: [],
        portfolioDivergencePct: 0,
      }),
      logger: new StructuredRuntimeLogger("runtime-os-test"),
      metrics,
      notifications: new NotificationEngine([sink]),
      config: {
        queueDrainIntervalMs: 10,
        reconciliationIntervalMs: 30,
        watchdogIntervalMs: 10,
      },
      reconnectBrokerSession: async () => {
        reconnectCalls += 1;
        return true;
      },
    });

    await supervisor.start();
    await sleep(30);
    expect(reconnectCalls).toBeGreaterThan(0);
    expect(supervisor.haltReason()).toBe(null);
    await supervisor.stop();
  });

  it("limits traffic below IBKR 50 msgs/sec", () => {
    const limiter = new TokenBucketRateLimiter(40, 0);
    let consumed = 0;
    for (let i = 0; i < 40; i += 1) {
      if (limiter.tryConsume(0, 1)) consumed += 1;
    }
    expect(consumed).toBe(40);
    expect(limiter.tryConsume(0, 1)).toBe(false);
    expect(limiter.tryConsume(500, 20)).toBe(true);
    expect(limiter.tryConsume(500, 1)).toBe(false);
    expect(() => new TokenBucketRateLimiter(50, 0)).toThrow(/<50/);
  });

  it("isolates data, management and order queues", async () => {
    const broker = new RecordingBroker();
    const manager = new BrokerSessionManager(
      broker,
      new TokenBucketRateLimiter(40),
      new MetricsRegistry(),
      new StructuredRuntimeLogger("runtime-os-test"),
    );
    const done: Promise<unknown>[] = [];
    done.push(manager.enqueue("data", { method: "GET", path: "/data/ticks" }));
    done.push(manager.enqueue("management", { method: "GET", path: "/session/status" }));
    done.push(manager.enqueue("orders", { method: "POST", path: "/orders" }));

    await manager.drainOnce();
    await manager.drainOnce();
    await manager.drainOnce();
    await Promise.all(done);

    expect(broker.paths[0]).toBe("GET:/session/status");
    expect(broker.paths[1]).toBe("POST:/orders");
    expect(broker.paths[2]).toBe("GET:/data/ticks");
  });
});
