/**
 * PROGRAM 5300 — Transform real system events → canonical UI events.
 * Only maps events that actually occurred — never invents activity.
 */

import type { Mission, MissionHistoryEntry } from "@/lib/mission-control/types";
import { readMissionHistory } from "@/lib/mission-control/mission-history";
import type { MissionEvent as LiveMissionEvent, MissionEventType, MissionTask, TaskStatus } from "@/lib/mission-control/live-mission/types";
import type { AutonomousStatus } from "@/lib/mission-control/autonomous-build/types";
import type {
  LiveMissionUIEvent,
  LiveMissionUIEventType,
  LiveMissionVisibleState,
} from "./types";

const MAX_UI_EVENTS = 50;

function uiEventId(): string {
  return `ui-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

/** Map internal task status → visible UI state. */
export function taskStatusToVisible(status: TaskStatus, blocked = false, paused = false): LiveMissionVisibleState {
  if (paused) return "PAUSED";
  if (blocked) return "BLOCKED";
  switch (status) {
    case "Queued":
      return "QUEUED";
    case "Running":
      return "RUNNING";
    case "Waiting":
      return "WAITING";
    case "Completed":
      return "COMPLETED";
    case "Failed":
      return "FAILED";
    default:
      return "QUEUED";
  }
}

/** Map autonomous loop status → mission-level visible state. */
export function autonomousStatusToVisible(status?: AutonomousStatus, pausedByUser = false): LiveMissionVisibleState | null {
  if (pausedByUser || status === "paused") return "PAUSED";
  if (status === "awaiting_approval") return "BLOCKED";
  if (status === "running") return "RUNNING";
  if (status === "completed") return "COMPLETED";
  return null;
}

const EVENT_TYPE_MAP: Partial<Record<MissionEventType, LiveMissionUIEventType>> = {
  intention_classified: "mission_created",
  phase_advance: "stage_started",
  factory_step: "stage_completed",
  execution: "task_running",
  worker_start: "department_started",
  worker_complete: "task_completed",
  task_progress: "task_running",
  task_complete: "task_completed",
  checkpoint_saved: "stage_completed",
  approval_required: "approval_required",
  approval_resolved: "task_completed",
  decision_resolved: "decision_requested",
  risk_detected: "task_failed",
  autonomous_paused: "mission_paused",
  autonomous_resumed: "mission_resumed",
  queue_updated: "task_queued",
  discovery: "department_started",
  deploy_stub: "artifact_created",
  gtm: "artifact_created",
};

/** Transform a single live-mission MissionEvent → UI event (if mappable). */
export function adaptMissionEvent(event: LiveMissionEvent): LiveMissionUIEvent | null {
  const uiType = EVENT_TYPE_MAP[event.type];
  if (!uiType) return null;

  return {
    id: `adapt-${event.id}`,
    type: uiType,
    timestamp: event.timestamp,
    label: event.label,
    department: event.department,
    phase: event.phase,
    metadata: event.metadata,
  };
}

/** Transform mission-history entry → UI event when action matches known patterns. */
export function adaptHistoryEntry(entry: MissionHistoryEntry): LiveMissionUIEvent | null {
  const action = entry.action.toLowerCase();
  let type: LiveMissionUIEventType | null = null;

  if (action.includes("iniciada") || action.includes("started")) type = "stage_started";
  else if (action.includes("generado") || action.includes("completad")) type = "stage_completed";
  else if (action.includes("plan")) type = "artifact_created";
  else if (action.includes("validación") || action.includes("build")) type = "stage_completed";
  else if (action.includes("deploy")) type = "artifact_created";

  if (!type) return null;

  return {
    id: `hist-${entry.id}`,
    type,
    timestamp: entry.timestamp,
    label: entry.action,
    phase: entry.phase,
    metadata: entry.detail ? { detail: entry.detail } : undefined,
  };
}

/** Derive UI events from task state transitions (only for tasks with real timestamps). */
export function adaptTaskSnapshot(task: MissionTask, paused = false): LiveMissionUIEvent[] {
  const events: LiveMissionUIEvent[] = [];
  const state = taskStatusToVisible(task.status, false, paused);

  if (state === "QUEUED") {
    events.push({
      id: uiEventId(),
      type: "task_queued",
      timestamp: task.createdAt,
      label: task.label,
      department: task.department,
      taskId: task.id,
    });
  }
  if (state === "RUNNING") {
    events.push({
      id: uiEventId(),
      type: "task_running",
      timestamp: task.updatedAt,
      label: task.label,
      department: task.department,
      taskId: task.id,
    });
  }
  if (state === "COMPLETED") {
    events.push({
      id: uiEventId(),
      type: "task_completed",
      timestamp: task.updatedAt,
      label: task.label,
      department: task.department,
      taskId: task.id,
    });
  }
  if (state === "FAILED") {
    events.push({
      id: uiEventId(),
      type: "task_failed",
      timestamp: task.updatedAt,
      label: task.label,
      department: task.department,
      taskId: task.id,
    });
  }
  return events;
}

/** Collect all UI events from a mission's real data sources. */
export function collectUIEventsFromMission(mission: Mission): LiveMissionUIEvent[] {
  const seen = new Set<string>();
  const events: LiveMissionUIEvent[] = [];

  function push(ev: LiveMissionUIEvent | null) {
    if (!ev) return;
    const key = `${ev.type}:${ev.timestamp}:${ev.label}`;
    if (seen.has(key)) return;
    seen.add(key);
    events.push(ev);
  }

  for (const ev of mission.liveMission?.events ?? []) {
    push(adaptMissionEvent(ev));
  }

  const history = readMissionHistory(mission.id);
  for (const entry of history.entries) {
    push(adaptHistoryEntry(entry));
  }

  if (mission.autonomous?.pendingApproval && !mission.autonomous.pendingApproval.resolved) {
    push({
      id: uiEventId(),
      type: "approval_required",
      timestamp: mission.autonomous.updatedAt,
      label: mission.autonomous.pendingApproval.title,
      department: "CEO",
      taskId: mission.autonomous.pendingApproval.taskId,
    });
  }

  for (const d of mission.pendingDecisions.filter((p) => !p.resolved)) {
    push({
      id: uiEventId(),
      type: "decision_requested",
      timestamp: mission.updatedAt,
      label: d.title,
      department: "CEO",
    });
  }

  const paused = mission.autonomous?.pausedByUser || mission.autonomous?.status === "paused";
  if (paused) {
    push({
      id: uiEventId(),
      type: "mission_paused",
      timestamp: mission.autonomous?.updatedAt ?? mission.updatedAt,
      label: "Misión pausada",
    });
  }

  if (mission.autonomous?.status === "running" && mission.autonomous.enabled) {
    const lastResume = mission.liveMission?.events.find((e) => e.type === "autonomous_resumed");
    if (lastResume) {
      push({
        id: `resume-${lastResume.id}`,
        type: "mission_resumed",
        timestamp: lastResume.timestamp,
        label: lastResume.label,
      });
    }
  }

  for (const task of mission.liveMission?.tasks ?? []) {
    for (const te of adaptTaskSnapshot(task, paused)) {
      push(te);
    }
  }

  return events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, MAX_UI_EVENTS);
}

import { registerMissionEventListener } from "@/lib/mission-control/live-mission/event-emitter";

/** Register adapter on mission-control event bus — returns unsubscribe. */
export function wireMissionEventAdapter(
  onUIEvent: (event: LiveMissionUIEvent) => void
): () => void {
  return registerMissionEventListener((event) => {
    const adapted = adaptMissionEvent(event);
    if (adapted) onUIEvent(adapted);
  });
}
