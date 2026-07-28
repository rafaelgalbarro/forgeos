/** PROGRAM 5300 — Selectors for live mission UI panels. */

import type {
  LiveMissionSerializableSnapshot,
  LiveMissionUIEvent,
  LiveMissionTaskView,
  LiveMissionDepartmentView,
  LiveMissionArtifactView,
  LiveMissionWarning,
  LiveMissionVisibleState,
} from "./types";

export function selectMissionProgress(snapshot: LiveMissionSerializableSnapshot): number {
  return snapshot.progress;
}

export function selectMissionStage(snapshot: LiveMissionSerializableSnapshot): string {
  return snapshot.stage;
}

export function selectMissionState(snapshot: LiveMissionSerializableSnapshot): LiveMissionVisibleState {
  return snapshot.missionState;
}

export function selectRecentEvents(snapshot: LiveMissionSerializableSnapshot, limit = 20): LiveMissionUIEvent[] {
  return snapshot.recentEvents.slice(0, limit);
}

export function selectQueuedTasks(snapshot: LiveMissionSerializableSnapshot): LiveMissionTaskView[] {
  return snapshot.queuedTasks;
}

export function selectRunningTasks(snapshot: LiveMissionSerializableSnapshot): LiveMissionTaskView[] {
  return snapshot.runningTasks;
}

export function selectCompletedTasks(snapshot: LiveMissionSerializableSnapshot): LiveMissionTaskView[] {
  return snapshot.completedTasks;
}

export function selectFailedTasks(snapshot: LiveMissionSerializableSnapshot): LiveMissionTaskView[] {
  return snapshot.failedTasks;
}

export function selectActiveDepartments(snapshot: LiveMissionSerializableSnapshot): LiveMissionDepartmentView[] {
  return snapshot.activeDepartments.filter((d) => d.state === "RUNNING" || d.state === "WAITING");
}

export function selectAllDepartments(snapshot: LiveMissionSerializableSnapshot): LiveMissionDepartmentView[] {
  return snapshot.activeDepartments;
}

export function selectArtifactFeed(snapshot: LiveMissionSerializableSnapshot, limit = 10): LiveMissionArtifactView[] {
  return snapshot.generatedArtifacts.slice(0, limit);
}

export function selectErrorsAndWarnings(snapshot: LiveMissionSerializableSnapshot): LiveMissionWarning[] {
  return snapshot.errorsAndWarnings;
}

export function selectEtaSeconds(snapshot: LiveMissionSerializableSnapshot): number {
  return snapshot.estimatedRemainingTime;
}

export function selectHasActiveWork(snapshot: LiveMissionSerializableSnapshot): boolean {
  return (
    snapshot.runningTasks.length > 0 ||
    snapshot.queuedTasks.length > 0 ||
    snapshot.missionState === "RUNNING"
  );
}

export function selectApprovalEvents(snapshot: LiveMissionSerializableSnapshot): LiveMissionUIEvent[] {
  return snapshot.recentEvents.filter((e) => e.type === "approval_required" || e.type === "decision_requested");
}

export function formatEta(seconds: number): string {
  if (seconds <= 0) return "—";
  if (seconds < 60) return `~${seconds}s`;
  const mins = Math.ceil(seconds / 60);
  return `~${mins} min`;
}

export function visibleStateLabel(state: LiveMissionVisibleState): string {
  const labels: Record<LiveMissionVisibleState, string> = {
    QUEUED: "En cola",
    RUNNING: "Ejecutando",
    WAITING: "Esperando",
    COMPLETED: "Completado",
    FAILED: "Fallido",
    BLOCKED: "Bloqueado",
    PAUSED: "Pausado",
  };
  return labels[state];
}

export function visibleStateBadgeVariant(
  state: LiveMissionVisibleState
): "default" | "amber" | "accent" | "red" {
  if (state === "COMPLETED") return "accent";
  if (state === "RUNNING" || state === "WAITING") return "amber";
  if (state === "FAILED" || state === "BLOCKED") return "red";
  return "default";
}
