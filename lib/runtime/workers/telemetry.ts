/** ForgeOS Worker Runtime — telemetry records (Epic 4.3). */

import type { VentureState } from "../state-machine/types";
import type { SupportedTask } from "./types";
import type { WorkerStatus } from "./worker-status";

export interface WorkerTelemetryRecord {
  id: string;
  timestamp: string;
  workerId: string;
  taskType: SupportedTask;
  ventureId: string;
  ventureState: VentureState;
  workerStatus: WorkerStatus;
  latencyMs: number;
  durationMs: number;
  success: boolean;
  errors: string[];
  warnings: string[];
  provider?: string;
  model?: string;
  fallback?: boolean;
  metadata?: Record<string, unknown>;
}

export interface WorkerTelemetryStore {
  record(entry: Omit<WorkerTelemetryRecord, "id" | "timestamp">): WorkerTelemetryRecord;
  list(limit?: number): WorkerTelemetryRecord[];
  listByWorker(workerId: string, limit?: number): WorkerTelemetryRecord[];
  listByVenture(ventureId: string, limit?: number): WorkerTelemetryRecord[];
  clear(): void;
}

let recordCounter = 0;

export function createWorkerTelemetryStore(): WorkerTelemetryStore {
  const records: WorkerTelemetryRecord[] = [];

  return {
    record(entry) {
      const record: WorkerTelemetryRecord = {
        ...entry,
        id: `tel_${++recordCounter}_${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
      records.push(record);
      return record;
    },
    list(limit) {
      const slice = limit !== undefined ? records.slice(-limit) : [...records];
      return slice.reverse();
    },
    listByWorker(workerId, limit) {
      const filtered = records.filter((r) => r.workerId === workerId);
      const slice = limit !== undefined ? filtered.slice(-limit) : filtered;
      return [...slice].reverse();
    },
    listByVenture(ventureId, limit) {
      const filtered = records.filter((r) => r.ventureId === ventureId);
      const slice = limit !== undefined ? filtered.slice(-limit) : filtered;
      return [...slice].reverse();
    },
    clear() {
      records.length = 0;
      recordCounter = 0;
    },
  };
}
