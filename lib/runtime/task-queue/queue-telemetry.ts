/** Task queue telemetry (Epic 4.4). */

import type { QueueMetrics } from "./queue-metrics";
import type { QueueTask } from "./types";

export interface QueueTelemetryRecord {
  timestamp: string;
  taskId: string;
  ventureId: string;
  event: string;
  latencyMs?: number;
  queuePosition?: number | null;
  recommendedWorkerId?: string | null;
  retryAttempt?: number;
  warning?: string;
  failure?: string;
}

export interface QueueTelemetrySummary {
  records: QueueTelemetryRecord[];
  avgLatencyMs: number;
  maxLatencyMs: number;
  totalWarnings: number;
  totalFailures: number;
  totalRetries: number;
}

export class QueueTelemetryStore {
  private records: QueueTelemetryRecord[] = [];
  private maxRecords: number;

  constructor(maxRecords = 500) {
    this.maxRecords = maxRecords;
  }

  record(entry: Omit<QueueTelemetryRecord, "timestamp">): QueueTelemetryRecord {
    const record: QueueTelemetryRecord = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    this.records.push(record);
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }
    return record;
  }

  list(limit?: number): QueueTelemetryRecord[] {
    const slice = limit ? this.records.slice(-limit) : [...this.records];
    return slice.reverse();
  }

  summarize(): QueueTelemetrySummary {
    const latencies = this.records
      .map((r) => r.latencyMs)
      .filter((v): v is number => typeof v === "number");
    const avg =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;
    const max = latencies.length > 0 ? Math.max(...latencies) : 0;

    return {
      records: this.list(50),
      avgLatencyMs: avg,
      maxLatencyMs: max,
      totalWarnings: this.records.filter((r) => r.warning).length,
      totalFailures: this.records.filter((r) => r.failure).length,
      totalRetries: this.records.filter((r) => r.event === "retry").length,
    };
  }

  clear(): void {
    this.records = [];
  }
}

export function telemetryFromMetrics(
  metrics: QueueMetrics,
  tasks: QueueTask[],
): QueueTelemetrySummary {
  const records: QueueTelemetryRecord[] = tasks.slice(0, 20).map((t) => ({
    timestamp: t.updatedAt,
    taskId: t.id,
    ventureId: t.ventureId,
    event: `status:${t.status}`,
    queuePosition: t.queuePosition,
    recommendedWorkerId: t.recommendedWorkerId,
    retryAttempt: t.attemptCount,
    warning: t.status === "BLOCKED" ? "Task blocked by dependencies" : undefined,
    failure: t.lastError ?? undefined,
  }));

  return {
    records,
    avgLatencyMs: metrics.avgWaitMs,
    maxLatencyMs: metrics.maxWaitMs,
    totalWarnings: metrics.warningCount,
    totalFailures: metrics.failureCount,
    totalRetries: metrics.retryCount,
  };
}
