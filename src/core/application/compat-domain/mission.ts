/**
 * Mission aggregate stub (Program 6010).
 * Aligned with lib/mission-control/types MissionSessionStatus / MissionIntent.
 */

import type { ActorId, MissionId, VentureId, WorkspaceId } from "./ids";
import type { DomainEvent } from "./events";

export type MissionStatus =
  | "DRAFT"
  | "UNDERSTANDING"
  | "PLANNING"
  | "BUILDING"
  | "VALIDATING"
  | "READY_FOR_DEPLOY"
  | "OPERATING"
  | "PAUSED"
  | "BLOCKED"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

export interface MissionIntent {
  primary: string;
  secondary?: string[];
  confidence: number;
  extractedIdea?: string;
}

export interface Mission {
  id: MissionId;
  workspaceId: WorkspaceId;
  ventureId?: VentureId;
  founderId: ActorId;
  intent: MissionIntent | null;
  status: MissionStatus;
  planApproved: boolean;
  conversation: Array<{ id: string; role: string; content: string; at: string }>;
  decisionIds: string[];
  outputIds: string[];
  timeline: Array<{ id: string; at: string; label: string; type: string }>;
  createdAt: string;
  updatedAt: string;
  pausedAt?: string;
  cancelledAt?: string;
}

export interface MissionCreateInput {
  workspaceId: WorkspaceId;
  ventureId?: VentureId;
  founderId: ActorId;
  idea?: string;
}

const ALLOWED_TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  DRAFT: ["UNDERSTANDING", "PLANNING", "CANCELLED"],
  UNDERSTANDING: ["PLANNING", "PAUSED", "CANCELLED", "BLOCKED"],
  PLANNING: ["BUILDING", "PAUSED", "CANCELLED", "BLOCKED"],
  BUILDING: ["VALIDATING", "PAUSED", "CANCELLED", "BLOCKED", "FAILED"],
  VALIDATING: ["READY_FOR_DEPLOY", "PAUSED", "CANCELLED", "BLOCKED", "FAILED"],
  READY_FOR_DEPLOY: ["OPERATING", "PAUSED", "CANCELLED"],
  OPERATING: ["PAUSED", "COMPLETED", "CANCELLED"],
  PAUSED: ["UNDERSTANDING", "PLANNING", "BUILDING", "VALIDATING", "READY_FOR_DEPLOY", "OPERATING", "CANCELLED"],
  BLOCKED: ["PLANNING", "BUILDING", "VALIDATING", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  FAILED: ["PLANNING", "CANCELLED"],
};

export function createMissionAggregate(
  id: MissionId,
  input: MissionCreateInput,
  now: string,
): { mission: Mission; events: DomainEvent[] } {
  const mission: Mission = {
    id,
    workspaceId: input.workspaceId,
    ventureId: input.ventureId,
    founderId: input.founderId,
    intent: input.idea
      ? { primary: "VENTURE", confidence: 0.5, extractedIdea: input.idea.trim() }
      : null,
    status: "DRAFT",
    planApproved: false,
    conversation: [],
    decisionIds: [],
    outputIds: [],
    timeline: [{ id: `tl-${id}-created`, at: now, label: "Mission created", type: "system" }],
    createdAt: now,
    updatedAt: now,
  };
  return {
    mission,
    events: [
      {
        eventId: `evt-mis-${id}`,
        type: "MissionCreated",
        occurredAt: now,
        aggregateId: id,
        aggregateType: "Mission",
        workspaceId: input.workspaceId,
        payload: { ventureId: input.ventureId ?? null },
      },
    ],
  };
}

export function assertMissionTransition(from: MissionStatus, to: MissionStatus): void {
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid mission transition: ${from} -> ${to}`);
  }
}

export function updateMissionIntent(
  mission: Mission,
  intent: MissionIntent,
  now: string,
): { mission: Mission; events: DomainEvent[] } {
  const next: Mission = {
    ...mission,
    intent,
    status: mission.status === "DRAFT" ? "UNDERSTANDING" : mission.status,
    updatedAt: now,
    timeline: [
      ...mission.timeline,
      { id: `tl-${mission.id}-intent`, at: now, label: "Intent updated", type: "intent" },
    ],
  };
  if (mission.status === "DRAFT") {
    assertMissionTransition("DRAFT", "UNDERSTANDING");
  }
  return {
    mission: next,
    events: [
      {
        eventId: `evt-mis-intent-${mission.id}-${now}`,
        type: "MissionIntentUpdated",
        occurredAt: now,
        aggregateId: mission.id,
        aggregateType: "Mission",
        workspaceId: mission.workspaceId,
        payload: { primary: intent.primary, confidence: intent.confidence },
      },
    ],
  };
}

export function approveMissionPlan(
  mission: Mission,
  now: string,
): { mission: Mission; events: DomainEvent[] } {
  if (mission.status !== "PLANNING" && mission.status !== "UNDERSTANDING" && mission.status !== "DRAFT") {
    assertMissionTransition(mission.status, "BUILDING");
  }
  if (mission.status === "DRAFT" || mission.status === "UNDERSTANDING") {
    // allow jump into planning approval path
  }
  const from = mission.status === "PLANNING" ? "PLANNING" : mission.status;
  if (from === "PLANNING") {
    assertMissionTransition("PLANNING", "BUILDING");
  } else if (from === "UNDERSTANDING") {
    assertMissionTransition("UNDERSTANDING", "PLANNING");
  } else if (from === "DRAFT") {
    assertMissionTransition("DRAFT", "PLANNING");
  } else {
    throw new Error(`Cannot approve plan from status ${mission.status}`);
  }
  const nextStatus: MissionStatus = from === "PLANNING" ? "BUILDING" : "PLANNING";
  const next: Mission = {
    ...mission,
    planApproved: true,
    status: nextStatus,
    updatedAt: now,
    timeline: [
      ...mission.timeline,
      { id: `tl-${mission.id}-plan`, at: now, label: "Plan approved", type: "approval" },
    ],
  };
  return {
    mission: next,
    events: [
      {
        eventId: `evt-mis-plan-${mission.id}-${now}`,
        type: "MissionPlanApproved",
        occurredAt: now,
        aggregateId: mission.id,
        aggregateType: "Mission",
        workspaceId: mission.workspaceId,
        payload: { status: nextStatus },
      },
    ],
  };
}

export function pauseMission(mission: Mission, now: string): { mission: Mission; events: DomainEvent[] } {
  assertMissionTransition(mission.status, "PAUSED");
  const next: Mission = {
    ...mission,
    status: "PAUSED",
    pausedAt: now,
    updatedAt: now,
    timeline: [...mission.timeline, { id: `tl-${mission.id}-pause`, at: now, label: "Paused", type: "system" }],
  };
  return {
    mission: next,
    events: [
      {
        eventId: `evt-mis-pause-${mission.id}-${now}`,
        type: "MissionPaused",
        occurredAt: now,
        aggregateId: mission.id,
        aggregateType: "Mission",
        workspaceId: mission.workspaceId,
        payload: {},
      },
    ],
  };
}

export function resumeMission(
  mission: Mission,
  resumeTo: MissionStatus,
  now: string,
): { mission: Mission; events: DomainEvent[] } {
  if (mission.status !== "PAUSED") {
    throw new Error(`Cannot resume mission in status ${mission.status}`);
  }
  assertMissionTransition("PAUSED", resumeTo);
  const next: Mission = {
    ...mission,
    status: resumeTo,
    pausedAt: undefined,
    updatedAt: now,
    timeline: [...mission.timeline, { id: `tl-${mission.id}-resume`, at: now, label: "Resumed", type: "system" }],
  };
  return {
    mission: next,
    events: [
      {
        eventId: `evt-mis-resume-${mission.id}-${now}`,
        type: "MissionResumed",
        occurredAt: now,
        aggregateId: mission.id,
        aggregateType: "Mission",
        workspaceId: mission.workspaceId,
        payload: { status: resumeTo },
      },
    ],
  };
}

export function cancelMission(mission: Mission, now: string): { mission: Mission; events: DomainEvent[] } {
  assertMissionTransition(mission.status, "CANCELLED");
  const next: Mission = {
    ...mission,
    status: "CANCELLED",
    cancelledAt: now,
    updatedAt: now,
    timeline: [...mission.timeline, { id: `tl-${mission.id}-cancel`, at: now, label: "Cancelled", type: "system" }],
  };
  return {
    mission: next,
    events: [
      {
        eventId: `evt-mis-cancel-${mission.id}-${now}`,
        type: "MissionCancelled",
        occurredAt: now,
        aggregateId: mission.id,
        aggregateType: "Mission",
        workspaceId: mission.workspaceId,
        payload: {},
      },
    ],
  };
}
