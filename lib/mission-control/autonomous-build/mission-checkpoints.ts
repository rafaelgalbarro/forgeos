/** Save/restore mission state at phase boundaries (localStorage). */

import type { MissionPhase } from "../types";
import type { MissionTask } from "../live-mission/types";
import type { AutonomousState, Checkpoint } from "./types";

const CHECKPOINT_PREFIX = "forgeos-autonomous-checkpoint-";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function checkpointId(): string {
  return `cp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function storageKey(missionId: string): string {
  return `${CHECKPOINT_PREFIX}${missionId}`;
}

export function createCheckpoint(
  missionId: string,
  phase: MissionPhase,
  taskIndex: number,
  queueSnapshot: MissionTask[],
  completedTaskIds: string[]
): Checkpoint {
  return {
    id: checkpointId(),
    missionId,
    phase,
    taskIndex,
    timestamp: new Date().toISOString(),
    queueSnapshot: queueSnapshot.map((t) => ({ ...t })),
    completedTaskIds: [...completedTaskIds],
  };
}

export function saveCheckpoint(missionId: string, checkpoint: Checkpoint): void {
  if (!isBrowser()) return;
  try {
    const existing = readCheckpoints(missionId);
    const updated = [checkpoint, ...existing.filter((c) => c.id !== checkpoint.id)].slice(0, 20);
    localStorage.setItem(storageKey(missionId), JSON.stringify(updated));
  } catch {
    /* ignore */
  }
}

export function readCheckpoints(missionId: string): Checkpoint[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(storageKey(missionId));
    if (!raw) return [];
    return JSON.parse(raw) as Checkpoint[];
  } catch {
    return [];
  }
}

export function getLatestCheckpoint(missionId: string): Checkpoint | undefined {
  return readCheckpoints(missionId)[0];
}

export function restoreFromCheckpoint(
  state: AutonomousState,
  checkpoint: Checkpoint
): AutonomousState {
  return {
    ...state,
    tasks: checkpoint.queueSnapshot.map((t) => ({ ...t })),
    completedTaskIds: [...checkpoint.completedTaskIds],
    currentTaskId: checkpoint.queueSnapshot.find((t) => t.status === "Running")?.id,
    lastCheckpointId: checkpoint.id,
    status: state.enabled ? "running" : "idle",
    updatedAt: new Date().toISOString(),
  };
}

export function shouldCheckpoint(phase: MissionPhase, prevPhase?: MissionPhase): boolean {
  if (!prevPhase) return true;
  return phase !== prevPhase;
}
