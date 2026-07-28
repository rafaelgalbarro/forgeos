/** Lab harness for Task Queue (Epic 4.4) — isolated from production routes. */

import { createRuntimeEventBus } from "@/lib/runtime/event-bus/event-bus";
import type { RuntimeEvent } from "@/lib/runtime/event-bus/types";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import {
  connectSchedulerToEventBus,
  createRuntimeScheduler,
} from "@/lib/runtime/scheduler/scheduler";
import { createWorkerRegistry } from "@/lib/runtime/workers/worker-registry";
import { registerOfficialWorkers } from "@/lib/runtime/workers/worker-factory";
import {
  createRuntimeTaskQueue,
  planSchedulerTasksIntoQueue,
  getSchedulerQueuePlan,
  publishTaskCreated,
  publishTaskStatusChange,
  type QueueSnapshot,
  type QueueTask,
  type QueueTaskPriority,
  type RuntimeTaskQueue,
} from "@/lib/runtime/task-queue";

export interface TaskQueueLabSession {
  ventureId: string;
  queue: RuntimeTaskQueue;
  getSnapshot(): QueueSnapshot;
  getPlan(): ReturnType<typeof getSchedulerQueuePlan>;
  getTaskEvents(): RuntimeEvent[];
  generateMockTasks(): QueueTask[];
  changePriority(taskId: string, priority: QueueTaskPriority): QueueTask | null;
  cancelTask(taskId: string): QueueTask | null;
  moveToDeadLetter(taskId: string, cause?: string): void;
  reset(): void;
}

const MOCK_PIPELINE: Array<{
  type: QueueTask["type"];
  priority: QueueTaskPriority;
  label: string;
}> = [
  { type: "DISCOVERY_REVIEW", priority: "P1_HIGH", label: "Discovery review" },
  { type: "RESEARCH_RUN", priority: "P1_HIGH", label: "Research run" },
  { type: "PRODUCT_UPDATE", priority: "P2_MEDIUM", label: "Product update" },
  { type: "BUILD_PLAN_UPDATE", priority: "P2_MEDIUM", label: "Build plan update" },
  { type: "BUILD", priority: "P1_HIGH", label: "Build" },
  { type: "QA", priority: "P2_MEDIUM", label: "QA" },
  { type: "LAUNCH", priority: "P0_CRITICAL", label: "Launch" },
  { type: "RISK_REVIEW", priority: "P0_CRITICAL", label: "Risk review" },
  { type: "MEMORY_WRITE", priority: "P3_LOW", label: "Memory write" },
];

function seedSchedulerEvents(
  bus: ReturnType<typeof createRuntimeEventBus>,
  ventureId: string,
): void {
  const events = [
    {
      type: "VENTURE_CREATED" as const,
      payload: { ventureId, name: "FleetPulse Lab" },
    },
    {
      type: "DISCOVERY_COMPLETED" as const,
      payload: { ventureId, stage: "discovery", summary: "Lab discovery" },
    },
    {
      type: "RESEARCH_COMPLETED" as const,
      payload: { ventureId, stage: "research", summary: "Lab research" },
    },
    {
      type: "CEO_DECISION_CREATED" as const,
      payload: {
        ventureId,
        decisionId: `dec_${Date.now()}`,
        title: "Proceed",
        recommendation: "approve",
        confidence: 0.9,
      },
    },
    {
      type: "BOARD_CONSENSUS_REACHED" as const,
      payload: {
        ventureId,
        consensusId: `con_${Date.now()}`,
        level: "majority",
        finalDecision: "proceed",
        confidence: 0.85,
      },
    },
    {
      type: "RISK_DETECTED" as const,
      payload: {
        ventureId,
        riskId: `risk_${Date.now()}`,
        severity: "critical" as const,
        title: "Compliance gap",
      },
    },
  ];

  for (const evt of events) {
    bus.publish({ type: evt.type, source: "task-queue-lab", payload: evt.payload });
  }
}

export function createTaskQueueLab(ventureId = LAB_MOCK_VENTURE_ID): TaskQueueLabSession {
  const bus = createRuntimeEventBus();
  const scheduler = connectSchedulerToEventBus(createRuntimeScheduler(), bus);
  const queue = createRuntimeTaskQueue();
  const registry = createWorkerRegistry();
  registerOfficialWorkers(registry);
  const workers = registry.list();

  seedSchedulerEvents(bus, ventureId);

  return {
    ventureId,
    queue,

    getSnapshot(): QueueSnapshot {
      return queue.getSnapshot(ventureId);
    },

    getPlan() {
      return getSchedulerQueuePlan(queue, ventureId);
    },

    getTaskEvents(): RuntimeEvent[] {
      return bus
        .getHistory()
        .filter((e) => e.category === "task")
        .slice(-30);
    },

    generateMockTasks(): QueueTask[] {
      planSchedulerTasksIntoQueue(scheduler, queue, workers, ventureId);

      const created: QueueTask[] = [];
      for (const spec of MOCK_PIPELINE) {
        const existing = queue.getTasks({ ventureId, type: spec.type });
        if (existing.length > 0) {
          created.push(...existing);
          continue;
        }
        const task = queue.enqueue({
          type: spec.type,
          ventureId,
          priority: spec.priority,
          label: spec.label,
          retryPolicy: spec.priority === "P0_CRITICAL" ? "MAX_5" : "MAX_3",
        });
        publishTaskCreated(bus, "task-queue-lab", task);
        if (task.status === "READY") {
          publishTaskStatusChange(bus, "task-queue-lab", task);
        }
        created.push(task);
      }

      for (const t of queue.getTasks({ ventureId, type: "PRODUCT_UPDATE" })) {
        if (t.status !== "COMPLETED") {
          queue.updateStatus(t.id, "COMPLETED", { reason: "Mock product complete" });
        }
      }

      return created;
    },

    changePriority(taskId: string, priority: QueueTaskPriority): QueueTask | null {
      return queue.changePriority(taskId, priority);
    },

    cancelTask(taskId: string): QueueTask | null {
      const result = queue.cancel(taskId, "Cancelled from lab");
      if (result) publishTaskStatusChange(bus, "task-queue-lab", result);
      return result;
    },

    moveToDeadLetter(taskId: string, cause = "Manual dead letter from lab"): void {
      const task = queue.getTask(taskId);
      if (!task) return;
      queue.moveToDeadLetter(taskId, cause, task.recommendedWorkerId ?? undefined);
      const updated = queue.getTask(taskId);
      if (updated) publishTaskStatusChange(bus, "task-queue-lab", updated, { error: cause });
    },

    reset(): void {
      scheduler.disconnect();
      scheduler.clear();
      queue.clear();
      bus.clear();
    },
  };
}

export function runTaskQueueDemo(session: TaskQueueLabSession): QueueSnapshot {
  session.generateMockTasks();
  return session.getSnapshot();
}
