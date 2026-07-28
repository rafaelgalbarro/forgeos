/** PROGRAM 6040 — Runtime Event Bus → canonical envelope adapter */

import type { RuntimeEvent } from "@/lib/runtime/event-bus/types";
import type { DomainEventEnvelope } from "../envelope";
import { wrapLegacyEvent } from "./wrap-legacy";

const RUNTIME_DOMAIN_MAP: Partial<Record<string, string>> = {
  BUILD_COMPLETED: "BUILD_STATE_CHANGED",
  BUILD_REQUESTED: "BUILD_STATE_CHANGED",
  VENTURE_STATE_CHANGED: "MISSION_STATE_CHANGED",
  TASK_COMPLETED: "EXECUTION_NODE_STATE_CHANGED",
  TASK_FAILED: "EXECUTION_NODE_STATE_CHANGED",
  TASK_STARTED: "EXECUTION_NODE_STATE_CHANGED",
  EXECUTION_STARTED: "EXECUTION_NODE_STATE_CHANGED",
  EXECUTION_FINISHED: "EXECUTION_NODE_STATE_CHANGED",
  EXECUTION_FAILED: "EXECUTION_NODE_STATE_CHANGED",
  CEO_DECISION_CREATED: "DECISION_STATE_CHANGED",
};

export function adaptRuntimeEvent(
  event: RuntimeEvent,
  opts?: { workspaceId?: string; missionId?: string }
): DomainEventEnvelope {
  const mapped = RUNTIME_DOMAIN_MAP[event.type];
  const payload = event.payload as unknown as Record<string, unknown>;
  const ventureId =
    typeof payload.ventureId === "string" ? payload.ventureId : undefined;

  return wrapLegacyEvent({
    integrationType: "RUNTIME_EVENT_INGESTED",
    mappedDomainType: mapped,
    catalogKind: mapped ? "domain" : "integration",
    source: `runtime:${event.source}`,
    sourceEventId: event.id,
    occurredAt: event.timestamp,
    workspaceId: opts?.workspaceId,
    missionId: opts?.missionId ?? ventureId,
    aggregateType: mapped?.includes("BUILD")
      ? "Build"
      : mapped?.includes("DECISION")
        ? "Decision"
        : mapped?.includes("EXECUTION") || mapped?.includes("NODE")
          ? "ExecutionNode"
          : mapped?.includes("MISSION")
            ? "Mission"
            : "System",
    aggregateId:
      (typeof payload.buildId === "string" && payload.buildId) ||
      (typeof payload.taskId === "string" && payload.taskId) ||
      (typeof payload.decisionId === "string" && payload.decisionId) ||
      ventureId ||
      event.id,
    actorKind: "runtime",
    actorId: event.source,
    payload: {
      runtimeType: event.type,
      category: event.category,
      ...payload,
      to:
        payload.to ??
        (event.type === "BUILD_COMPLETED"
          ? (payload as { status?: string }).status ?? "SUCCEEDED"
          : undefined),
      status:
        payload.status ??
        payload.to ??
        (event.type.endsWith("_COMPLETED") ? "COMPLETED" : undefined),
    },
  });
}

/** Subscribe to an existing RuntimeEventBus and forward into a publish fn */
export function wireRuntimeEventBus(
  bus: {
    subscribeAll: (handler: (event: RuntimeEvent) => void) => () => void;
  },
  publish: (event: DomainEventEnvelope) => void | Promise<void>,
  opts?: { workspaceId?: string; missionId?: string }
): () => void {
  return bus.subscribeAll((event) => {
    void publish(adaptRuntimeEvent(event, opts));
  });
}
