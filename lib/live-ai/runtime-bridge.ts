/** Live AI — bridge to real Runtime data with mock fallbacks (RC5.5). */

import { MESH_DEPARTMENTS } from "@/lib/executive-mesh";
import { listAllCapabilities } from "@/lib/capabilities";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import { createRuntimeObservabilityLab } from "@/lib/lab/runtime-observability-lab";
import { createTaskQueueLab, runTaskQueueDemo } from "@/lib/lab/task-queue-lab";
import { createWorkersLab } from "@/lib/lab/workers-lab";
import type { RuntimeDashboardSnapshot } from "@/lib/runtime/observability/types";
import type { QueueSnapshot } from "@/lib/runtime/task-queue/types";
import type { WorkerInstance } from "@/lib/runtime/workers/types";
import type { WorkerRuntimeMetrics } from "@/lib/runtime/workers/metrics";

export interface LiveAiRuntimeSnapshot {
  ventureId: string;
  source: "runtime" | "mock";
  departments: typeof MESH_DEPARTMENTS;
  capabilities: ReturnType<typeof listAllCapabilities>;
  queue: QueueSnapshot | null;
  workers: WorkerInstance[];
  workerMetrics: WorkerRuntimeMetrics | null;
  observability: RuntimeDashboardSnapshot | null;
  memoryRecords: Array<{ id: string; type: string; summary: string; at: string }>;
  decisionNodes: Array<{ id: string; title: string; nodeType: string; confidence: number }>;
}

const EMPTY_QUEUE_METRICS: QueueSnapshot["metrics"] = {
  totalTasks: 0,
  pending: 0,
  ready: 0,
  waiting: 0,
  blocked: 0,
  running: 0,
  completed: 0,
  failed: 0,
  cancelled: 0,
  timeout: 0,
  retrying: 0,
  deadLetter: 0,
  avgWaitMs: 0,
  maxWaitMs: 0,
  avgExecutionMs: 0,
  maxExecutionMs: 0,
  retryCount: 0,
  failureCount: 0,
  warningCount: 0,
  byPriority: { P0_CRITICAL: 0, P1_HIGH: 0, P2_MEDIUM: 0, P3_LOW: 0 },
  byType: {},
  recommendedWorkerCounts: {},
};

function emptyQueueSnapshot(): QueueSnapshot {
  return {
    tasks: [],
    deadLetter: [],
    metrics: EMPTY_QUEUE_METRICS,
    telemetry: { records: [], avgLatencyMs: 0, maxLatencyMs: 0, totalWarnings: 0, totalFailures: 0, totalRetries: 0 },
  };
}

export function buildLiveAiRuntimeSnapshot(ventureId = LAB_MOCK_VENTURE_ID): LiveAiRuntimeSnapshot {
  let queue: QueueSnapshot | null = null;
  let workers: WorkerInstance[] = [];
  let workerMetrics: WorkerRuntimeMetrics | null = null;
  let observability: RuntimeDashboardSnapshot | null = null;
  let source: "runtime" | "mock" = "mock";

  try {
    const tqLab = createTaskQueueLab(ventureId);
    queue = runTaskQueueDemo(tqLab);
    source = "runtime";
  } catch {
    queue = emptyQueueSnapshot();
  }

  try {
    const workersLab = createWorkersLab(ventureId);
    workers = workersLab.getWorkers();
    workerMetrics = workersLab.getMetrics();
    source = "runtime";
  } catch {
    workers = [];
  }

  try {
    const obsLab = createRuntimeObservabilityLab(ventureId);
    observability = obsLab.seedDemo();
    source = "runtime";
  } catch {
    observability = null;
  }

  const capabilities = listAllCapabilities();
  const memoryRecords = [
    { id: "mem-1", type: "research", summary: "Mercado SaaS flotas eléctricas — €2.1B TAM España", at: new Date().toISOString() },
    { id: "mem-2", type: "decision", summary: "Board aprueba MVP B2B en 8 semanas", at: new Date().toISOString() },
    { id: "mem-3", type: "build", summary: "Arquitectura Next.js + Postgres + Stripe", at: new Date().toISOString() },
  ];

  const decisionNodes = [
    { id: "dg-1", title: "Founder intent", nodeType: "Intent", confidence: 0.95 },
    { id: "dg-2", title: "CEO brief", nodeType: "CEO", confidence: 0.92 },
    { id: "dg-3", title: "Board consensus", nodeType: "Consensus", confidence: 0.88 },
    { id: "dg-4", title: "Build decision", nodeType: "Decision", confidence: 0.85 },
    { id: "dg-5", title: "Memory persist", nodeType: "Memory", confidence: 0.9 },
  ];

  return {
    ventureId,
    source,
    departments: MESH_DEPARTMENTS,
    capabilities: capabilities.slice(0, 12),
    queue,
    workers,
    workerMetrics,
    observability,
    memoryRecords,
    decisionNodes,
  };
}
