import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import type { BrokerEngine, BrokerEngineRequest } from "@/src/core/application/ports/broker-engine";
import type {
  BreakerSnapshot,
  RuntimeCheckpoint,
  RuntimeHaltReason,
  RuntimeReconciliationSnapshot,
} from "./domain";

export interface RuntimeLogger {
  info(event: string, payload?: Record<string, unknown>): void;
  warn(event: string, payload?: Record<string, unknown>): void;
  error(event: string, payload?: Record<string, unknown>): void;
}

export class StructuredRuntimeLogger implements RuntimeLogger {
  constructor(private readonly namespace: string) {}

  info(event: string, payload: Record<string, unknown> = {}): void {
    this.emit("INFO", event, payload);
  }

  warn(event: string, payload: Record<string, unknown> = {}): void {
    this.emit("WARN", event, payload);
  }

  error(event: string, payload: Record<string, unknown> = {}): void {
    this.emit("ERROR", event, payload);
  }

  private emit(level: "INFO" | "WARN" | "ERROR", event: string, payload: Record<string, unknown>): void {
    const entry = {
      timestampUtc: new Date().toISOString(),
      level,
      namespace: this.namespace,
      event,
      ...payload,
    };
    console.log(JSON.stringify(entry));
  }
}

export class MetricsRegistry {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly histograms = new Map<string, number[]>();

  increment(counter: string, by = 1): void {
    this.counters.set(counter, (this.counters.get(counter) ?? 0) + by);
  }

  setGauge(gauge: string, value: number): void {
    this.gauges.set(gauge, value);
  }

  observe(histogram: string, value: number): void {
    const values = this.histograms.get(histogram) ?? [];
    values.push(value);
    this.histograms.set(histogram, values);
  }

  snapshot() {
    return {
      counters: Object.fromEntries(this.counters.entries()),
      gauges: Object.fromEntries(this.gauges.entries()),
      histograms: Object.fromEntries(this.histograms.entries()),
    };
  }
}

export interface AlertSink {
  send(alert: {
    readonly severity: "INFO" | "WARN" | "CRITICAL";
    readonly event: string;
    readonly reason?: RuntimeHaltReason;
    readonly context?: Record<string, unknown>;
  }): Promise<void>;
}

export class NotificationEngine {
  constructor(private readonly sinks: readonly AlertSink[]) {}

  async alert(input: {
    readonly severity: "INFO" | "WARN" | "CRITICAL";
    readonly event: string;
    readonly reason?: RuntimeHaltReason;
    readonly context?: Record<string, unknown>;
  }): Promise<void> {
    await Promise.all(this.sinks.map(async (sink) => sink.send(input)));
  }
}

export class PersistentRuntimeStateStore {
  constructor(private readonly checkpointFile: string, private readonly auditDir: string) {}

  async read(): Promise<RuntimeCheckpoint | null> {
    try {
      const data = await fs.readFile(this.checkpointFile, "utf8");
      return JSON.parse(data) as RuntimeCheckpoint;
    } catch {
      return null;
    }
  }

  async write(checkpoint: RuntimeCheckpoint): Promise<void> {
    await fs.mkdir(path.dirname(this.checkpointFile), { recursive: true });
    await fs.mkdir(this.auditDir, { recursive: true });
    const serialized = JSON.stringify(checkpoint, null, 2);
    await fs.writeFile(this.checkpointFile, serialized, "utf8");
    const auditFile = path.join(
      this.auditDir,
      `runtime-audit-${checkpoint.timestampUtc.replace(/[:.]/g, "-")}.json`,
    );
    await fs.writeFile(auditFile, serialized, "utf8");
  }
}

export type BrokerQueueChannel = "data" | "management" | "orders";

type QueueItem = {
  readonly request: BrokerEngineRequest;
  readonly channel: BrokerQueueChannel;
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
};

export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefillMs: number;

  constructor(
    readonly capacityPerSecond: number,
    nowMs = Date.now(),
  ) {
    if (!Number.isFinite(capacityPerSecond) || capacityPerSecond <= 0 || capacityPerSecond >= 50) {
      throw new Error("Broker rate limiter must be >0 and <50 msgs/sec (IBKR safety rule).");
    }
    this.tokens = capacityPerSecond;
    this.lastRefillMs = nowMs;
  }

  tryConsume(nowMs = Date.now(), cost = 1): boolean {
    this.refill(nowMs);
    if (cost > this.tokens) return false;
    this.tokens -= cost;
    return true;
  }

  available(nowMs = Date.now()): number {
    this.refill(nowMs);
    return this.tokens;
  }

  private refill(nowMs: number): void {
    const elapsedMs = nowMs - this.lastRefillMs;
    if (elapsedMs <= 0) return;
    const refill = (elapsedMs / 1000) * this.capacityPerSecond;
    this.tokens = Math.min(this.capacityPerSecond, this.tokens + refill);
    this.lastRefillMs = nowMs;
  }
}

export class BrokerSessionManager {
  private readonly queues: Record<BrokerQueueChannel, QueueItem[]> = {
    data: [],
    management: [],
    orders: [],
  };

  private connected = true;
  private orderStateAmbiguous = false;

  constructor(
    private readonly brokerEngine: BrokerEngine,
    private readonly limiter: TokenBucketRateLimiter,
    private readonly metrics: MetricsRegistry,
    private readonly logger: RuntimeLogger,
  ) {}

  enqueue<T>(channel: BrokerQueueChannel, request: BrokerEngineRequest): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queues[channel].push({
        request,
        channel,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
    });
  }

  markConnection(state: boolean): void {
    this.connected = state;
  }

  isConnected(): boolean {
    return this.connected;
  }

  hasAmbiguousOrderState(): boolean {
    return this.orderStateAmbiguous;
  }

  async drainOnce(): Promise<void> {
    if (!this.connected) return;
    while (this.limiter.tryConsume(Date.now(), 1)) {
      const item = this.nextItem();
      if (!item) return;
      try {
        const started = Date.now();
        const response = await this.brokerEngine.request<unknown>(item.request);
        this.metrics.increment(`broker.queue.${item.channel}.ok`);
        this.metrics.observe("broker.request.latency_ms", Date.now() - started);
        item.resolve(response);
      } catch (error) {
        this.metrics.increment(`broker.queue.${item.channel}.error`);
        this.logger.error("broker_request_failed", {
          channel: item.channel,
          path: item.request.path,
          method: item.request.method,
          message: error instanceof Error ? error.message : "unknown",
        });
        if (item.channel === "orders") {
          this.orderStateAmbiguous = true;
        }
        item.reject(error instanceof Error ? error : new Error("Unknown broker failure."));
      }
    }
  }

  queueSizes(): Record<BrokerQueueChannel, number> {
    return {
      data: this.queues.data.length,
      management: this.queues.management.length,
      orders: this.queues.orders.length,
    };
  }

  private nextItem(): QueueItem | null {
    // Management and order messages are intentionally prioritized over data.
    const priority: readonly BrokerQueueChannel[] = ["management", "orders", "data"];
    for (const channel of priority) {
      const item = this.queues[channel].shift();
      if (item) return item;
    }
    return null;
  }
}

export interface ReconciliationAudit {
  readonly checkpoint: RuntimeCheckpoint;
  readonly reconciliation: RuntimeReconciliationSnapshot;
  readonly breakerStates: readonly BreakerSnapshot[];
}
