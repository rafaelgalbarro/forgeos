/** PROGRAM 6040 — Live Mission events → canonical envelope (keeps real activity) */

import type { MissionEvent } from "@/lib/mission-control/live-mission/types";
import type { DomainEventEnvelope } from "../envelope";
import { wrapLegacyEvent } from "./wrap-legacy";

const LIVE_MISSION_MAP: Partial<Record<string, string>> = {
  intention_classified: "MISSION_CREATED",
  phase_advance: "MISSION_STATE_CHANGED",
  factory_step: "ORCHESTRATION_STEP_COMPLETED",
  execution: "EXECUTION_NODE_STATE_CHANGED",
  worker_start: "EXECUTION_NODE_STATE_CHANGED",
  worker_complete: "EXECUTION_NODE_STATE_CHANGED",
  task_progress: "EXECUTION_NODE_STATE_CHANGED",
  task_complete: "EXECUTION_NODE_STATE_CHANGED",
  checkpoint_saved: "SNAPSHOT_TAKEN",
  approval_required: "APPROVAL_REQUESTED",
  approval_resolved: "APPROVAL_GRANTED",
  decision_resolved: "DECISION_STATE_CHANGED",
  risk_detected: "MISSION_STATE_CHANGED",
  autonomous_paused: "MISSION_PAUSED",
  autonomous_resumed: "MISSION_RESUMED",
  deploy_stub: "DEPLOYMENT_STATE_CHANGED",
  gtm: "OUTPUT_STATE_CHANGED",
};

export function adaptLiveMissionEvent(
  event: MissionEvent,
  opts: { missionId: string; workspaceId?: string }
): DomainEventEnvelope {
  const mapped = LIVE_MISSION_MAP[event.type];
  const isApp =
    mapped === "ORCHESTRATION_STEP_COMPLETED" ||
    mapped === "ORCHESTRATION_STEP_STARTED";

  return wrapLegacyEvent({
    integrationType: "LIVE_MISSION_EVENT_INGESTED",
    mappedDomainType: mapped,
    catalogKind: mapped ? (isApp ? "application" : "domain") : "integration",
    source: "live-mission",
    sourceEventId: event.id,
    occurredAt: event.timestamp,
    workspaceId: opts.workspaceId,
    missionId: opts.missionId,
    aggregateType: mapped?.includes("DEPLOYMENT")
      ? "Deployment"
      : mapped?.includes("OUTPUT")
        ? "Output"
        : mapped?.includes("DECISION") || mapped?.includes("APPROVAL")
          ? "Decision"
          : mapped?.includes("NODE") || mapped?.includes("EXECUTION")
            ? "ExecutionNode"
            : "Mission",
    aggregateId: opts.missionId,
    actorKind: "system",
    actorId: event.department ?? "live-mission",
    payload: {
      label: event.label,
      liveType: event.type,
      department: event.department ?? null,
      phase: event.phase ?? null,
      icon: event.icon ?? null,
      ...(event.metadata ?? {}),
      status: event.type.includes("complete")
        ? "COMPLETED"
        : event.type.includes("fail") || event.type === "risk_detected"
          ? "FAILED"
          : event.type.includes("pause")
            ? "PAUSED"
            : "RUNNING",
    },
  });
}

export function wireLiveMissionEvents(
  register: (listener: (event: MissionEvent) => void) => () => void,
  publish: (event: DomainEventEnvelope) => void | Promise<void>,
  resolveMissionId: (event: MissionEvent) => string,
  opts?: { workspaceId?: string }
): () => void {
  return register((event) => {
    const missionId = resolveMissionId(event);
    void publish(
      adaptLiveMissionEvent(event, {
        missionId,
        workspaceId: opts?.workspaceId,
      })
    );
  });
}
