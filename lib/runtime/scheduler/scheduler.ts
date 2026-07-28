/** ForgeOS Runtime Scheduler — main engine (Epic 4.1). */

import { getSharedRuntimeEventBus } from "../event-bus/event-bus";
import type { RuntimeEvent, RuntimeEventBus, RuntimeEventType, Unsubscribe } from "../event-bus/types";
import {
  getDependencyTypesForTask,
  hasBlockingDependencies,
  resolveTaskDependencies,
} from "./dependencies";
import { assignPriority } from "./priority";
import { SchedulerStore, nextTaskId } from "./scheduler-store";
import { resolveDependencyStatus } from "./task-status";
import { buildExecutionPlan } from "./task-planner";
import type {
  RuntimeScheduler,
  RuntimeSchedulerOptions,
  SchedulerSnapshot,
  SchedulerTask,
  SchedulerTaskType,
  ExecutionPlan,
} from "./types";

const TASK_LABELS: Record<SchedulerTaskType, string> = {
  DISCOVERY_REVIEW: "Discovery review",
  RESEARCH_RUN: "Research run",
  PRODUCT_UPDATE: "Product update",
  CEO_REVIEW: "CEO review",
  BOARD_REVIEW: "Board review",
  SIMULATOR_UPDATE: "Simulator update",
  BUILD_PLAN_UPDATE: "Build plan update",
  MEMORY_WRITE: "Memory write",
  RISK_REVIEW: "Risk review",
  OPPORTUNITY_REVIEW: "Opportunity review",
};

interface TaskDraft {
  type: SchedulerTaskType;
  ventureId: string;
  metadata?: Record<string, unknown>;
  severity?: "low" | "medium" | "high" | "critical";
  impact?: "low" | "medium" | "high";
  hasPendingDecision?: boolean;
  researchIncomplete?: boolean;
  productIncomplete?: boolean;
  memoryPending?: boolean;
  ventureBlocked?: boolean;
}

interface CompletionRule {
  eventType: RuntimeEventType;
  completeType: SchedulerTaskType;
}

const COMPLETION_RULES: CompletionRule[] = [
  { eventType: "DISCOVERY_COMPLETED", completeType: "DISCOVERY_REVIEW" },
  { eventType: "RESEARCH_COMPLETED", completeType: "RESEARCH_RUN" },
];

/** Tasks created by these events are already fulfilled by the event itself. */
const IMMEDIATE_COMPLETE_EVENTS: Partial<Record<RuntimeEventType, SchedulerTaskType>> = {
  CEO_DECISION_CREATED: "CEO_REVIEW",
  BOARD_CONSENSUS_REACHED: "BOARD_REVIEW",
  MEMORY_UPDATED: "MEMORY_WRITE",
};

const SUBSCRIBED_EVENTS: RuntimeEventType[] = [
  "VENTURE_CREATED",
  "DISCOVERY_COMPLETED",
  "RESEARCH_COMPLETED",
  "CEO_DECISION_CREATED",
  "BOARD_CONSENSUS_REACHED",
  "RISK_DETECTED",
  "OPPORTUNITY_DETECTED",
  "MEMORY_UPDATED",
];

function extractVentureId(type: RuntimeEventType, payload: Record<string, unknown>): string {
  if (typeof payload.ventureId === "string") return payload.ventureId;
  return "global";
}

function eventToTaskDrafts(
  type: RuntimeEventType,
  payload: Record<string, unknown>,
): TaskDraft[] {
  const ventureId = extractVentureId(type, payload);

  switch (type) {
    case "VENTURE_CREATED":
      return [{ type: "DISCOVERY_REVIEW", ventureId, researchIncomplete: true }];

    case "DISCOVERY_COMPLETED":
      return [{ type: "RESEARCH_RUN", ventureId, researchIncomplete: true }];

    case "RESEARCH_COMPLETED":
      return [
        { type: "PRODUCT_UPDATE", ventureId, productIncomplete: true },
        { type: "SIMULATOR_UPDATE", ventureId },
      ];

    case "CEO_DECISION_CREATED":
      return [
        {
          type: "CEO_REVIEW",
          ventureId,
          hasPendingDecision: true,
          metadata: {
            decisionId: payload.decisionId,
            title: payload.title,
          },
        },
      ];

    case "BOARD_CONSENSUS_REACHED":
      return [
        {
          type: "BOARD_REVIEW",
          ventureId,
          metadata: {
            consensusId: payload.consensusId,
            finalDecision: payload.finalDecision,
          },
        },
        { type: "BUILD_PLAN_UPDATE", ventureId, productIncomplete: true },
      ];

    case "RISK_DETECTED":
      return [
        {
          type: "RISK_REVIEW",
          ventureId,
          severity: payload.severity as TaskDraft["severity"],
          ventureBlocked: payload.severity === "critical",
          metadata: {
            riskId: payload.riskId,
            title: payload.title,
          },
        },
      ];

    case "OPPORTUNITY_DETECTED":
      return [
        {
          type: "OPPORTUNITY_REVIEW",
          ventureId,
          impact: payload.impact as TaskDraft["impact"],
          metadata: {
            opportunityId: payload.opportunityId,
            title: payload.title,
          },
        },
      ];

    case "MEMORY_UPDATED":
      return [
        {
          type: "MEMORY_WRITE",
          ventureId,
          memoryPending: true,
          metadata: {
            memoryId: payload.memoryId,
            memoryType: payload.memoryType,
            action: payload.action,
          },
        },
      ];

    default:
      return [];
  }
}

export function createRuntimeScheduler(
  options: RuntimeSchedulerOptions = {},
): RuntimeScheduler {
  const store = new SchedulerStore(options.maxTasks);

  function recomputeDependenciesAndStatuses(ventureId?: string): void {
    const scope = ventureId ? store.getByVenture(ventureId) : store.getAll();

    for (const task of scope) {
      const ventureTasks = store.getByVenture(task.ventureId);
      const dependsOn = resolveTaskDependencies(task, ventureTasks);
      store.update(task.id, {
        dependsOn,
        dependencyTypes: getDependencyTypesForTask(task.type),
      });
    }

    const tasksById = new Map(store.getAll().map((t) => [t.id, t]));

    for (const task of scope) {
      const current = store.get(task.id);
      if (!current) continue;

      const blocked = hasBlockingDependencies(current, tasksById);
      const met = !blocked;
      const nextStatus = resolveDependencyStatus(current.status, met, blocked);
      if (nextStatus !== current.status) {
        store.update(task.id, { status: nextStatus });
      }
    }
  }

  function completeTasksForEvent(type: RuntimeEventType, ventureId: string): void {
    const rule = COMPLETION_RULES.find((r) => r.eventType === type);
    if (!rule) return;

    const target = store.findIncompleteByType(rule.completeType, ventureId);
    if (target) {
      store.update(target.id, { status: "completed" });
    }
  }

  function createTaskFromDraft(
    draft: TaskDraft,
    eventId: string,
    eventType: RuntimeEventType,
  ): SchedulerTask {
    const now = new Date().toISOString();
    const priority = assignPriority({
      ventureId: draft.ventureId,
      taskType: draft.type,
      severity: draft.severity,
      impact: draft.impact,
      ventureBlocked: draft.ventureBlocked,
      hasPendingDecision: draft.hasPendingDecision,
      researchIncomplete: draft.researchIncomplete,
      productIncomplete: draft.productIncomplete,
      memoryPending: draft.memoryPending,
    });

    const ventureTasks = store.getByVenture(draft.ventureId);
    const provisional: SchedulerTask = {
      id: nextTaskId(),
      type: draft.type,
      ventureId: draft.ventureId,
      priority,
      status: "pending",
      sourceEventId: eventId,
      sourceEventType: eventType,
      dependsOn: [],
      dependencyTypes: getDependencyTypesForTask(draft.type),
      label: TASK_LABELS[draft.type],
      createdAt: now,
      updatedAt: now,
      metadata: draft.metadata ?? {},
    };

    provisional.dependsOn = resolveTaskDependencies(provisional, [...ventureTasks, provisional]);
    return provisional;
  }

  function ingestEvent(
    eventId: string,
    type: RuntimeEventType,
    payload: Record<string, unknown>,
  ): SchedulerTask[] {
    const ventureId = extractVentureId(type, payload);
    completeTasksForEvent(type, ventureId);

    const drafts = eventToTaskDrafts(type, payload);
    const created: SchedulerTask[] = [];

    for (const draft of drafts) {
      const task = createTaskFromDraft(draft, eventId, type);
      if (IMMEDIATE_COMPLETE_EVENTS[type] === draft.type) {
        task.status = "completed";
      }
      store.add(task);
      created.push(task);
    }

    recomputeDependenciesAndStatuses(ventureId === "global" ? undefined : ventureId);
    if (ventureId === "global") {
      recomputeDependenciesAndStatuses();
    }

    return created;
  }

  function getTasks(filter?: { ventureId?: string; status?: SchedulerTask["status"] }): SchedulerTask[] {
    let tasks = store.getAll();
    if (filter?.ventureId) {
      tasks = tasks.filter((t) => t.ventureId === filter.ventureId);
    }
    if (filter?.status) {
      tasks = tasks.filter((t) => t.status === filter.status);
    }
    return tasks.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority.localeCompare(b.priority);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }

  function getTask(id: string): SchedulerTask | undefined {
    return store.get(id);
  }

  function getExecutionPlan(ventureId?: string): ExecutionPlan {
    return buildExecutionPlan(store.getAll(), ventureId);
  }

  function getSnapshot(ventureId?: string): SchedulerSnapshot {
    const tasks = getTasks(ventureId ? { ventureId } : undefined);
    return {
      tasks,
      plan: getExecutionPlan(ventureId),
      taskCountByStatus: store.countByStatus(),
      taskCountByPriority: store.countByPriority(),
    };
  }

  function clear(): void {
    store.clear();
  }

  return {
    ingestEvent,
    getTasks,
    getTask,
    getExecutionPlan,
    getSnapshot,
    clear,
  };
}

export interface ConnectedRuntimeScheduler extends RuntimeScheduler {
  eventBus: RuntimeEventBus;
  disconnect(): void;
}

/** Wire scheduler to an event bus instance (subscribe only — no execution). */
export function connectSchedulerToEventBus(
  scheduler: RuntimeScheduler,
  eventBus: RuntimeEventBus,
): ConnectedRuntimeScheduler {
  const unsubscribers: Unsubscribe[] = [];

  for (const eventType of SUBSCRIBED_EVENTS) {
    const off = eventBus.subscribe(eventType, (event: RuntimeEvent<typeof eventType>) => {
      scheduler.ingestEvent(
        event.id,
        event.type,
        event.payload as unknown as Record<string, unknown>,
      );
    });
    unsubscribers.push(off);
  }

  return {
    ...scheduler,
    eventBus,
    disconnect(): void {
      for (const off of unsubscribers) {
        off();
      }
    },
  };
}

let sharedScheduler: ConnectedRuntimeScheduler | null = null;

export function getSharedRuntimeScheduler(eventBus?: RuntimeEventBus): ConnectedRuntimeScheduler {
  if (!sharedScheduler) {
    const bus = eventBus ?? getSharedRuntimeEventBus();
    sharedScheduler = connectSchedulerToEventBus(createRuntimeScheduler(), bus);
  }
  return sharedScheduler;
}

export function resetSharedRuntimeScheduler(): void {
  sharedScheduler?.disconnect();
  sharedScheduler?.clear();
  sharedScheduler = null;
}

export { SUBSCRIBED_EVENTS, TASK_LABELS };
