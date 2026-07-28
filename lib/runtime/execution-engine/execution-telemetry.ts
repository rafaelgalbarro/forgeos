/** ForgeOS Execution Engine — telemetry store (Epic 4.5). */

export interface ExecutionTelemetryRecord {
  sessionId: string;
  ventureId: string;
  workerId: string;
  taskId: string;
  taskType: string;
  timestamp: string;
  executionTimeMs: number;
  queueWaitMs: number | null;
  schedulerDelayMs: number | null;
  provider: string;
  model: string;
  latencyMs: number | null;
  fallback: boolean;
  success: boolean;
  warnings: number;
  retries: number;
}

export interface ExecutionTelemetrySummary {
  totalRuns: number;
  successCount: number;
  failureCount: number;
  retryCount: number;
  avgExecutionMs: number;
  avgQueueWaitMs: number;
  avgSchedulerDelayMs: number;
  workerUsage: Record<string, number>;
  providerUsage: Record<string, number>;
}

export class ExecutionTelemetryStore {
  private records: ExecutionTelemetryRecord[] = [];

  record(entry: ExecutionTelemetryRecord): void {
    this.records.unshift(entry);
    if (this.records.length > 1000) this.records.length = 1000;
  }

  list(limit = 50): ExecutionTelemetryRecord[] {
    return this.records.slice(0, limit);
  }

  summarize(): ExecutionTelemetrySummary {
    const totalRuns = this.records.length;
    const successCount = this.records.filter((r) => r.success).length;
    const failureCount = totalRuns - successCount;
    const retryCount = this.records.reduce((s, r) => s + r.retries, 0);

    const avg = (vals: number[]) =>
      vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

    const workerUsage: Record<string, number> = {};
    const providerUsage: Record<string, number> = {};
    for (const r of this.records) {
      workerUsage[r.workerId] = (workerUsage[r.workerId] ?? 0) + 1;
      providerUsage[r.provider] = (providerUsage[r.provider] ?? 0) + 1;
    }

    return {
      totalRuns,
      successCount,
      failureCount,
      retryCount,
      avgExecutionMs: avg(this.records.map((r) => r.executionTimeMs)),
      avgQueueWaitMs: avg(
        this.records.map((r) => r.queueWaitMs ?? 0).filter((v) => v > 0),
      ),
      avgSchedulerDelayMs: avg(
        this.records.map((r) => r.schedulerDelayMs ?? 0).filter((v) => v > 0),
      ),
      workerUsage,
      providerUsage,
    };
  }

  clear(): void {
    this.records = [];
  }
}
