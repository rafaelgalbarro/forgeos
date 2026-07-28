/** PROGRAM 5300 — Serializable snapshot builder (SSR-safe, no heavy imports). */

import type { Mission } from "@/lib/mission-control/types";
import { estimateQueueEtaSeconds } from "@/lib/mission-control/live-mission/mission-queue";
import { combinedProgress } from "@/lib/mission-control/live-mission/mission-progress";
import { executionProgressPercent } from "@/lib/mission-control/live-execution";
import { createEmptyLiveMissionState } from "@/lib/mission-control/live-mission/live-mission-snapshot";
import type {
  LiveMissionSerializableSnapshot,
  LiveMissionTaskView,
  LiveMissionDepartmentView,
  LiveMissionArtifactView,
  LiveMissionWarning,
  LiveMissionVisibleState,
} from "./types";
import {
  collectUIEventsFromMission,
  taskStatusToVisible,
  autonomousStatusToVisible,
} from "./mission-event-adapter";

export function createEmptySnapshot(missionId: string): LiveMissionSerializableSnapshot {
  return {
    missionId,
    generatedAt: new Date().toISOString(),
    stage: "UNDERSTAND",
    progress: 0,
    missionState: "WAITING",
    activeDepartments: [],
    queuedTasks: [],
    runningTasks: [],
    completedTasks: [],
    failedTasks: [],
    recentEvents: [],
    generatedArtifacts: [],
    estimatedRemainingTime: 0,
    errorsAndWarnings: [],
  };
}

function toTaskView(
  task: import("@/lib/mission-control/live-mission/types").MissionTask,
  paused: boolean,
  blocked: boolean,
  errorMessage?: string
): LiveMissionTaskView {
  return {
    id: task.id,
    label: task.label,
    department: task.department,
    state: taskStatusToVisible(task.status, blocked, paused),
    progress: task.progress,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    errorMessage,
  };
}

function departmentStateFromActivity(
  status: "idle" | "active" | "waiting" | "done",
  missionPaused: boolean
): LiveMissionVisibleState {
  if (missionPaused) return "PAUSED";
  switch (status) {
    case "active":
      return "RUNNING";
    case "waiting":
      return "WAITING";
    case "done":
      return "COMPLETED";
    default:
      return "QUEUED";
  }
}

function buildArtifacts(mission: Mission): LiveMissionArtifactView[] {
  const artifacts: LiveMissionArtifactView[] = [];

  for (const snap of mission.snapshots.filter((s) => s.status === "completed" && s.progress >= 100)) {
    artifacts.push({
      id: `snap-${snap.id}`,
      label: snap.label,
      type: snap.id,
      phase: mission.phase,
      createdAt: mission.updatedAt,
      summary: snap.summary,
    });
  }

  if (mission.gtmSnapshot) {
    artifacts.push({
      id: `gtm-${mission.id}`,
      label: "GTM Package",
      type: "gtm",
      phase: mission.phase,
      createdAt: mission.gtmSnapshot.generatedAt ?? new Date().toISOString(),
      summary: `${mission.gtmSnapshot.readyCount}/${mission.gtmSnapshot.deliverableCount} entregables GTM`,
    });
  }

  return artifacts;
}

function buildWarnings(mission: Mission, failedTasks: LiveMissionTaskView[]): LiveMissionWarning[] {
  const warnings: LiveMissionWarning[] = [];

  for (const risk of mission.status.risks) {
    warnings.push({
      id: `risk-${risk.slice(0, 20)}`,
      level: "warn",
      message: risk,
      timestamp: mission.updatedAt,
    });
  }

  for (const task of failedTasks) {
    warnings.push({
      id: `fail-${task.id}`,
      level: "error",
      message: task.errorMessage ?? `Tarea fallida: ${task.label}`,
      taskId: task.id,
      timestamp: task.updatedAt,
    });
  }

  for (const log of mission.liveMission?.logs.filter((l) => l.level === "warn" || l.level === "error") ?? []) {
    warnings.push({
      id: log.id,
      level: log.level === "error" ? "error" : "warn",
      message: log.message,
      timestamp: log.timestamp,
    });
  }

  return warnings.slice(0, 20);
}

function resolveMissionState(mission: Mission, paused: boolean, blocked: boolean): LiveMissionVisibleState {
  if (paused) return "PAUSED";
  if (blocked) return "BLOCKED";
  const autoState = autonomousStatusToVisible(mission.autonomous?.status, mission.autonomous?.pausedByUser);
  if (autoState) return autoState;
  if (mission.liveExecution.active) return "RUNNING";
  const hasQueued = mission.liveMission?.tasks.some((t) => t.status === "Queued");
  if (hasQueued) return "QUEUED";
  const allDone = mission.liveMission?.tasks.length
    ? mission.liveMission.tasks.every((t) => t.status === "Completed")
    : false;
  if (allDone) return "COMPLETED";
  return "WAITING";
}

/** Build full serializable snapshot from persisted mission — only real data. */
export function buildSerializableSnapshot(mission: Mission): LiveMissionSerializableSnapshot {
  const live = mission.liveMission ?? createEmptyLiveMissionState(mission.phase);
  const paused = Boolean(mission.autonomous?.pausedByUser || mission.autonomous?.status === "paused");
  const blocked = Boolean(
    mission.autonomous?.status === "awaiting_approval" ||
      mission.pendingDecisions.some((d) => d.important && !d.resolved)
  );

  const snapProgress = mission.snapshots.map((s) => s.progress);
  const progress = combinedProgress(mission.phase, snapProgress, executionProgressPercent(mission.liveExecution));

  const tasks = mission.autonomous?.tasks?.length ? mission.autonomous.tasks : live.tasks;
  const taskViews = tasks.map((t) => {
    const isFailed = t.status === "Failed";
    const logMsg = live.logs.find((l) => l.level === "error" && l.message.includes(t.label))?.message;
    return toTaskView(t, paused, blocked && t.status === "Waiting", isFailed ? logMsg : undefined);
  });

  const activeDepartments: LiveMissionDepartmentView[] = live.departmentActivity.map((d) => ({
    department: d.department,
    state: departmentStateFromActivity(d.status, paused),
    label: d.label,
    lastAction: d.lastAction,
  }));

  const failedTasks = taskViews.filter((t) => t.state === "FAILED");
  const etaFromAutonomous = mission.autonomous?.etaSeconds ?? 0;
  const etaFromQueue = estimateQueueEtaSeconds(tasks);

  return {
    missionId: mission.id,
    generatedAt: new Date().toISOString(),
    stage: mission.phase,
    progress,
    missionState: resolveMissionState(mission, paused, blocked),
    activeDepartments,
    queuedTasks: taskViews.filter((t) => t.state === "QUEUED"),
    runningTasks: taskViews.filter((t) => t.state === "RUNNING"),
    completedTasks: taskViews.filter((t) => t.state === "COMPLETED"),
    failedTasks,
    recentEvents: collectUIEventsFromMission(mission),
    generatedArtifacts: buildArtifacts(mission),
    estimatedRemainingTime: Math.max(etaFromAutonomous, etaFromQueue),
    errorsAndWarnings: buildWarnings(mission, failedTasks),
  };
}
