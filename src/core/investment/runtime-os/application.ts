import type {
  BreakerSnapshot,
  BreakerStatus,
  BrokerOrderState,
  BrokerPositionState,
  CircuitBreakerName,
  HealthSnapshot,
  RuntimeCheckpoint,
  RuntimeHaltReason,
  RuntimeHealthStatus,
  RuntimeReconciliationSnapshot,
} from "./domain";
import {
  BrokerSessionManager,
  MetricsRegistry,
  NotificationEngine,
  type PersistentRuntimeStateStore,
  type RuntimeLogger,
} from "./infrastructure";

type ReconciliationProvider = () => Promise<{
  readonly brokerOrders: readonly BrokerOrderState[];
  readonly brokerPositions: readonly BrokerPositionState[];
  readonly expectedOrders: readonly BrokerOrderState[];
  readonly expectedPositions: readonly BrokerPositionState[];
  readonly portfolioDivergencePct: number;
}>;

export interface RuntimeSupervisorConfig {
  readonly autoStart: boolean;
  readonly enableAutoLive: boolean;
  readonly watchdogIntervalMs: number;
  readonly reconciliationIntervalMs: number;
  readonly queueDrainIntervalMs: number;
  readonly maxHeartbeatLagMs: number;
  readonly maxReconnectAttempts: number;
  readonly brokerMessageRateLimitPerSec: number;
  readonly blockerDivergencePct: number;
}

const DEFAULT_CONFIG: RuntimeSupervisorConfig = {
  autoStart: false,
  enableAutoLive: false,
  watchdogIntervalMs: 2_000,
  reconciliationIntervalMs: 3_000,
  queueDrainIntervalMs: 20,
  maxHeartbeatLagMs: 10_000,
  maxReconnectAttempts: 5,
  brokerMessageRateLimitPerSec: 40,
  blockerDivergencePct: 1.5,
};

export class JobScheduler {
  private readonly jobs = new Map<string, ReturnType<typeof setInterval>>();

  schedule(name: string, everyMs: number, task: () => Promise<void> | void): void {
    this.cancel(name);
    const timer = setInterval(() => {
      void Promise.resolve(task());
    }, everyMs);
    this.jobs.set(name, timer);
  }

  cancel(name: string): void {
    const timer = this.jobs.get(name);
    if (!timer) return;
    clearInterval(timer);
    this.jobs.delete(name);
  }

  stopAll(): void {
    for (const timer of this.jobs.values()) clearInterval(timer);
    this.jobs.clear();
  }
}

export class EmergencyStop {
  private haltedReason: RuntimeHaltReason | null = null;

  halt(reason: RuntimeHaltReason): void {
    this.haltedReason = reason;
  }

  clear(): void {
    this.haltedReason = null;
  }

  isHalted(): boolean {
    return this.haltedReason !== null;
  }

  reason(): RuntimeHaltReason | null {
    return this.haltedReason;
  }
}

export class CircuitBreaker {
  private readonly states = new Map<CircuitBreakerName, BreakerSnapshot>();

  constructor(
    private readonly thresholds: Record<CircuitBreakerName, number>,
    private readonly nowProvider: () => string = () => new Date().toISOString(),
  ) {
    const mappings: Record<CircuitBreakerName, RuntimeHaltReason> = {
      "daily-loss": "DAILY_LOSS",
      "consecutive-errors": "CONSECUTIVE_ERRORS",
      "elevated-latency": "ELEVATED_LATENCY",
      "stale-data": "STALE_DATA",
      "connection-loss": "CONNECTION_LOSS",
      "too-many-rejects": "TOO_MANY_REJECTS",
      "abnormal-slippage": "ABNORMAL_SLIPPAGE",
      "portfolio-divergence": "PORTFOLIO_DIVERGENCE",
      "message-flood": "MESSAGE_FLOOD",
      "strategy-anomalies": "STRATEGY_ANOMALIES",
    };

    for (const [name, threshold] of Object.entries(this.thresholds) as Array<[CircuitBreakerName, number]>) {
      this.states.set(name, {
        name,
        status: "CLOSED",
        trippedAtUtc: null,
        lastValue: 0,
        threshold,
        reason: mappings[name],
      });
    }
  }

  evaluate(name: CircuitBreakerName, value: number): BreakerSnapshot {
    const current = this.states.get(name);
    if (!current) throw new Error(`Unknown breaker ${name}.`);
    const status: BreakerStatus = value >= current.threshold ? "OPEN" : "CLOSED";
    const next: BreakerSnapshot = {
      ...current,
      status,
      lastValue: value,
      trippedAtUtc: status === "OPEN" ? this.nowProvider() : current.trippedAtUtc,
    };
    this.states.set(name, next);
    return next;
  }

  trippedBreakers(): readonly BreakerSnapshot[] {
    return [...this.states.values()].filter((state) => state.status === "OPEN");
  }

  snapshot(): readonly BreakerSnapshot[] {
    return [...this.states.values()];
  }
}

export class HealthMonitor {
  private heartbeatAtUtc: string | null = null;
  private connected = true;
  private staleData = false;
  private consecutiveErrors = 0;
  private latencyMs = 0;
  private messageRatePerSec = 0;

  beat(nowUtc = new Date().toISOString()): void {
    this.heartbeatAtUtc = nowUtc;
  }

  markConnection(state: boolean): void {
    this.connected = state;
  }

  markStaleData(state: boolean): void {
    this.staleData = state;
  }

  observeLatency(latencyMs: number): void {
    this.latencyMs = latencyMs;
  }

  observeMessageRate(ratePerSec: number): void {
    this.messageRatePerSec = ratePerSec;
  }

  markError(): void {
    this.consecutiveErrors += 1;
  }

  clearErrors(): void {
    this.consecutiveErrors = 0;
  }

  snapshot(nowUtc = new Date().toISOString()): HealthSnapshot {
    const lag = this.heartbeatAtUtc ? Math.max(0, Date.parse(nowUtc) - Date.parse(this.heartbeatAtUtc)) : Number.MAX_SAFE_INTEGER;
    const status: RuntimeHealthStatus = this.connected && !this.staleData ? "HEALTHY" : "DEGRADED";
    return {
      status,
      connected: this.connected,
      heartbeatLagMs: lag,
      staleData: this.staleData,
      messageRatePerSec: this.messageRatePerSec,
      latencyMs: this.latencyMs,
      consecutiveErrors: this.consecutiveErrors,
      lastUpdatedUtc: nowUtc,
    };
  }
}

export class ReconciliationEngine {
  constructor(private readonly divergenceThresholdPct: number) {}

  reconcile(input: {
    readonly brokerOrders: readonly BrokerOrderState[];
    readonly brokerPositions: readonly BrokerPositionState[];
    readonly expectedOrders: readonly BrokerOrderState[];
    readonly expectedPositions: readonly BrokerPositionState[];
    readonly portfolioDivergencePct: number;
    readonly timestampUtc: string;
  }): RuntimeReconciliationSnapshot {
    const expectedOrders = new Set(input.expectedOrders.map((order) => order.orderId));
    const unknownOrders = input.brokerOrders.filter((order) => !expectedOrders.has(order.orderId));

    const expectedPositions = new Map(input.expectedPositions.map((position) => [position.symbol, position.quantity]));
    const unknownPositions = input.brokerPositions.filter(
      (position) => !expectedPositions.has(position.symbol) || expectedPositions.get(position.symbol) !== position.quantity,
    );

    const consistent =
      unknownOrders.length === 0 &&
      unknownPositions.length === 0 &&
      input.portfolioDivergencePct <= this.divergenceThresholdPct;

    return {
      timestampUtc: input.timestampUtc,
      unknownOrders,
      unknownPositions,
      portfolioDivergencePct: input.portfolioDivergencePct,
      consistent,
    };
  }
}

export class StateRecovery {
  constructor(private readonly stateStore: PersistentRuntimeStateStore) {}

  recover(): Promise<RuntimeCheckpoint | null> {
    return this.stateStore.read();
  }

  checkpoint(checkpoint: RuntimeCheckpoint): Promise<void> {
    return this.stateStore.write(checkpoint);
  }
}

export interface LiveRuntimeAdapter {
  recover(): Promise<void>;
  start(): Promise<void>;
  stop(): void;
  healthSnapshot(nowUtc?: string): { heartbeatLagMs: number; streamConnected: boolean; staleRuntime: boolean };
}

export interface RuntimeSupervisorDependencies {
  readonly liveRuntime: LiveRuntimeAdapter;
  readonly brokerSessions: BrokerSessionManager;
  readonly healthMonitor: HealthMonitor;
  readonly scheduler: JobScheduler;
  readonly reconciliation: ReconciliationEngine;
  readonly emergencyStop: EmergencyStop;
  readonly circuitBreaker: CircuitBreaker;
  readonly stateRecovery: StateRecovery;
  readonly reconciliationProvider: ReconciliationProvider;
  readonly logger: RuntimeLogger;
  readonly metrics: MetricsRegistry;
  readonly notifications: NotificationEngine;
  readonly config?: Partial<RuntimeSupervisorConfig>;
  readonly reconnectBrokerSession?: () => Promise<boolean>;
}

export class RuntimeSupervisor {
  private readonly config: RuntimeSupervisorConfig;
  private running = false;
  private reconnectAttempts = 0;
  private shutdownHooksInstalled = false;

  constructor(private readonly deps: RuntimeSupervisorDependencies) {
    this.config = { ...DEFAULT_CONFIG, ...(deps.config ?? {}) };
    if (this.config.brokerMessageRateLimitPerSec >= 50) {
      throw new Error("RuntimeSupervisor brokerMessageRateLimitPerSec must stay below IBKR 50 msgs/sec.");
    }
  }

  async boot(): Promise<void> {
    if (this.config.autoStart) {
      await this.start();
    }
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.enforceNoAutoLiveGuard();
    const checkpoint = await this.deps.stateRecovery.recover();
    if (checkpoint?.haltedReason) {
      this.deps.emergencyStop.halt(checkpoint.haltedReason);
      throw new Error(`Runtime checkpoint is halted: ${checkpoint.haltedReason}`);
    }

    await this.deps.liveRuntime.recover();
    await this.deps.liveRuntime.start();
    this.running = true;
    this.deps.healthMonitor.beat();
    this.deps.logger.info("runtime_supervisor_started", {
      messageRateLimitPerSec: this.config.brokerMessageRateLimitPerSec,
    });
    this.installGracefulShutdownHooks();
    this.scheduleLoops();
  }

  async stop(): Promise<void> {
    this.running = false;
    this.deps.scheduler.stopAll();
    this.deps.liveRuntime.stop();
    await this.deps.stateRecovery.checkpoint(this.buildCheckpoint());
    this.deps.logger.info("runtime_supervisor_stopped");
  }

  isBlocked(): boolean {
    return this.deps.emergencyStop.isHalted() || this.deps.circuitBreaker.trippedBreakers().length > 0;
  }

  haltReason(): RuntimeHaltReason | null {
    if (this.deps.emergencyStop.reason()) return this.deps.emergencyStop.reason();
    const firstTripped = this.deps.circuitBreaker.trippedBreakers()[0];
    return firstTripped?.reason ?? null;
  }

  private scheduleLoops(): void {
    this.deps.scheduler.schedule("watchdog", this.config.watchdogIntervalMs, async () =>
      this.runGuarded("watchdog", async () => this.watchdogLoop()),
    );
    this.deps.scheduler.schedule("reconciliation", this.config.reconciliationIntervalMs, async () =>
      this.runGuarded("reconciliation", async () => this.reconciliationLoop()),
    );
    this.deps.scheduler.schedule("broker-drain", this.config.queueDrainIntervalMs, async () => {
      await this.runGuarded("broker-drain", async () => {
        await this.deps.brokerSessions.drainOnce();
        const queueSizes = this.deps.brokerSessions.queueSizes();
        this.deps.metrics.setGauge("broker.queue.data", queueSizes.data);
        this.deps.metrics.setGauge("broker.queue.management", queueSizes.management);
        this.deps.metrics.setGauge("broker.queue.orders", queueSizes.orders);
      });
    });
  }

  private async watchdogLoop(): Promise<void> {
    if (!this.running || this.isBlocked()) return;
    const runtimeHealth = this.deps.liveRuntime.healthSnapshot();
    this.deps.healthMonitor.beat();
    this.deps.healthMonitor.markConnection(runtimeHealth.streamConnected && this.deps.brokerSessions.isConnected());
    this.deps.healthMonitor.markStaleData(runtimeHealth.staleRuntime);
    this.deps.healthMonitor.observeMessageRate(this.config.brokerMessageRateLimitPerSec);
    this.deps.healthMonitor.observeLatency(runtimeHealth.heartbeatLagMs);

    const health = this.deps.healthMonitor.snapshot();
    this.deps.metrics.setGauge("runtime.heartbeat_lag_ms", health.heartbeatLagMs);
    this.deps.metrics.setGauge("runtime.connected", health.connected ? 1 : 0);

    if (!health.connected) {
      await this.tryReconnectOrHalt("CONNECTION_LOSS");
      return;
    }
    if (health.heartbeatLagMs > this.config.maxHeartbeatLagMs) {
      await this.halt("WATCHDOG_TIMEOUT", { heartbeatLagMs: health.heartbeatLagMs });
      return;
    }
    if (this.deps.brokerSessions.hasAmbiguousOrderState()) {
      await this.halt("HALT_SYSTEM", {
        cause: "AMBIGUOUS_ORDER_STATE",
        detail: "Order request failed and may still have reached broker.",
      });
      return;
    }

    this.evaluateBreakers();
  }

  private async reconciliationLoop(): Promise<void> {
    if (!this.running || this.isBlocked()) return;
    const observed = await this.deps.reconciliationProvider();
    const result = this.deps.reconciliation.reconcile({
      ...observed,
      timestampUtc: new Date().toISOString(),
    });
    this.deps.metrics.setGauge("runtime.reconciliation.divergence_pct", result.portfolioDivergencePct);
    this.deps.metrics.setGauge("runtime.reconciliation.unknown_orders", result.unknownOrders.length);
    this.deps.metrics.setGauge("runtime.reconciliation.unknown_positions", result.unknownPositions.length);

    if (result.unknownOrders.length > 0) {
      await this.halt("HALT_SYSTEM", {
        cause: "UNKNOWN_ORDER_DETECTED",
        unknownOrders: result.unknownOrders,
      });
      return;
    }
    if (result.unknownPositions.length > 0) {
      await this.halt("HALT_SYSTEM", {
        cause: "UNKNOWN_POSITION_DETECTED",
        unknownPositions: result.unknownPositions,
      });
      return;
    }
    if (!result.consistent) {
      await this.halt("HALT_SYSTEM", {
        cause: "RECONCILIATION_INCONSISTENCY",
        divergencePct: result.portfolioDivergencePct,
      });
      return;
    }

    await this.deps.stateRecovery.checkpoint(this.buildCheckpoint());
  }

  private evaluateBreakers(): void {
    const health = this.deps.healthMonitor.snapshot();
    this.deps.circuitBreaker.evaluate("consecutive-errors", health.consecutiveErrors);
    this.deps.circuitBreaker.evaluate("elevated-latency", health.latencyMs);
    this.deps.circuitBreaker.evaluate("stale-data", health.staleData ? 1 : 0);
    this.deps.circuitBreaker.evaluate("connection-loss", health.connected ? 0 : 1);
    this.deps.circuitBreaker.evaluate("message-flood", health.messageRatePerSec);
    this.deps.circuitBreaker.evaluate("daily-loss", 0);
    this.deps.circuitBreaker.evaluate("too-many-rejects", 0);
    this.deps.circuitBreaker.evaluate("abnormal-slippage", 0);
    this.deps.circuitBreaker.evaluate("portfolio-divergence", 0);
    this.deps.circuitBreaker.evaluate("strategy-anomalies", 0);
  }

  private async tryReconnectOrHalt(reason: RuntimeHaltReason): Promise<void> {
    if (!this.deps.reconnectBrokerSession) {
      await this.halt(reason, { reconnect: "not_configured" });
      return;
    }
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      await this.halt(reason, { reconnectAttempts: this.reconnectAttempts });
      return;
    }
    this.reconnectAttempts += 1;
    const ok = await this.deps.reconnectBrokerSession();
    this.deps.brokerSessions.markConnection(ok);
    if (ok) {
      this.reconnectAttempts = 0;
      await this.deps.notifications.alert({ severity: "WARN", event: "broker_reconnected" });
      return;
    }
    await this.halt(reason, { reconnectAttempts: this.reconnectAttempts });
  }

  private buildCheckpoint(): RuntimeCheckpoint {
    return {
      timestampUtc: new Date().toISOString(),
      health: this.deps.healthMonitor.snapshot(),
      breakerStates: this.deps.circuitBreaker.snapshot(),
      haltedReason: this.haltReason(),
    };
  }

  private async halt(reason: RuntimeHaltReason, context: Record<string, unknown>): Promise<void> {
    this.deps.emergencyStop.halt(reason);
    this.running = false;
    this.deps.scheduler.stopAll();
    this.deps.liveRuntime.stop();
    this.deps.metrics.increment("runtime.halt.total");
    await this.deps.stateRecovery.checkpoint(this.buildCheckpoint());
    await this.deps.notifications.alert({ severity: "CRITICAL", event: "runtime_halted", reason, context });
    this.deps.logger.error("runtime_halted", { reason, ...context });
  }

  private enforceNoAutoLiveGuard(): void {
    if (this.config.enableAutoLive) return;
    if (process.env.LIVE_TRADING_ENABLED === "true") {
      throw new Error("Auto-live is disabled for runtime-os unless explicitly enabled.");
    }
  }

  private installGracefulShutdownHooks(): void {
    if (this.shutdownHooksInstalled) return;
    this.shutdownHooksInstalled = true;
    const shutdown = () => {
      void this.stop();
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  }

  private async runGuarded(name: string, task: () => Promise<void>): Promise<void> {
    try {
      await task();
    } catch (error) {
      this.deps.healthMonitor.markError();
      await this.halt("HALT_SYSTEM", {
        task: name,
        message: error instanceof Error ? error.message : "Unknown runtime-os failure.",
      });
    }
  }
}
