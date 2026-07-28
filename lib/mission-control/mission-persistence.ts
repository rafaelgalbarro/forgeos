/** Client-side mission persistence via localStorage. */

import type { DecisionRecord, Mission } from "./types";
import { DEFAULT_SNAPSHOT_ITEMS } from "./mission-snapshots";
import { createInitialMission } from "./mission-flow";
import { ensureLiveMission } from "./live-mission/event-emitter";
import { readCheckpoints } from "./autonomous-build/mission-checkpoints";
import type { AutonomousState } from "./autonomous-build/types";

const STORAGE_KEY = "forgeos-mission-control-missions";
const ACTIVE_KEY = "forgeos-mission-control-active";
const DECISION_LOG_KEY = "forgeos-mission-control-decision-log";
const AUTONOMOUS_KEY = "forgeos-autonomous-state";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function generateId(): string {
  return `mc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Append-only merge — never drops prior decision records. */
export function mergeDecisionLog(existing: DecisionRecord[] | undefined, incoming: DecisionRecord[] | undefined): DecisionRecord[] {
  const base = [...(existing ?? [])];
  for (const rec of incoming ?? []) {
    if (!base.some((r) => r.id === rec.id)) base.push(rec);
  }
  return base;
}

function readPersistedDecisionLog(missionId: string): DecisionRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(`${DECISION_LOG_KEY}-${missionId}`);
    return raw ? (JSON.parse(raw) as DecisionRecord[]) : [];
  } catch {
    return [];
  }
}

function writePersistedDecisionLog(missionId: string, log: DecisionRecord[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(`${DECISION_LOG_KEY}-${missionId}`, JSON.stringify(log));
}

function readPersistedAutonomous(missionId: string): AutonomousState | undefined {
  if (!isBrowser()) return undefined;
  try {
    const raw = localStorage.getItem(`${AUTONOMOUS_KEY}-${missionId}`);
    return raw ? (JSON.parse(raw) as AutonomousState) : undefined;
  } catch {
    return undefined;
  }
}

function writePersistedAutonomous(missionId: string, state: AutonomousState): void {
  if (!isBrowser()) return;
  localStorage.setItem(`${AUTONOMOUS_KEY}-${missionId}`, JSON.stringify(state));
}

export function readAutonomousState(missionId: string): AutonomousState | undefined {
  return readPersistedAutonomous(missionId);
}

export function saveAutonomousState(missionId: string, state: AutonomousState): void {
  writePersistedAutonomous(missionId, state);
  const checkpoints = readCheckpoints(missionId);
  if (state.checkpoints.length && !checkpoints.length) {
    for (const cp of state.checkpoints) {
      /* checkpoints saved individually via mission-checkpoints */
    }
  }
}

export function readAllMissions(): Mission[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Mission[];
  } catch {
    return [];
  }
}

export function writeAllMissions(missions: Mission[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(missions));
}

export function getActiveMissionId(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveMissionId(id: string | null): void {
  if (!isBrowser()) return;
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function getMissionById(id: string): Mission | undefined {
  // @deprecated PROGRAM 6070 — mission.reads: prefer DualReadService + src/core/domain/mission (see DEPRECATION.md). Do not delete while consumers exist.
  const mission = readAllMissions().find((m) => m.id === id);
  if (!mission) return undefined;
  const persistedLog = readPersistedDecisionLog(id);
  const decisionLog = mergeDecisionLog(mission.decisionLog, persistedLog);
  const autonomous = mission.autonomous ?? readPersistedAutonomous(id);
  let m = decisionLog.length ? { ...mission, decisionLog } : mission;
  if (autonomous) m = { ...m, autonomous };
  return m;
}

export function saveMission(mission: Mission): void {
  const missions = readAllMissions();
  const idx = missions.findIndex((m) => m.id === mission.id);
  const prev = idx >= 0 ? missions[idx] : undefined;
  const persistedLog = readPersistedDecisionLog(mission.id);
  const decisionLog = mergeDecisionLog(mergeDecisionLog(prev?.decisionLog, persistedLog), mission.decisionLog);
  writePersistedDecisionLog(mission.id, decisionLog);
  const updated = ensureLiveMission({
    ...mission,
    decisionLog,
    updatedAt: new Date().toISOString(),
  });
  if (mission.autonomous) {
    writePersistedAutonomous(mission.id, mission.autonomous);
  }
  if (idx >= 0) missions[idx] = updated;
  else missions.push(updated);
  writeAllMissions(missions);
  setActiveMissionId(updated.id);
}

export function createNewMission(idea?: string): Mission {
  const mission = createInitialMission(generateId(), idea);
  saveMission(mission);
  return mission;
}

export function listMissionIds(): string[] {
  return readAllMissions().map((m) => m.id);
}

export function getMissionCount(): number {
  return readAllMissions().length;
}

export function ensureSnapshots(mission: Mission): Mission {
  let m = mission;
  if (!mission.snapshots?.length) {
    m = { ...m, snapshots: [...DEFAULT_SNAPSHOT_ITEMS] };
  }
  return ensureLiveMission(m);
}
