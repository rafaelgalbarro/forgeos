/** PROGRAM 5150 — Append-only mission history (repository layer only). */

import type { MissionHistory, MissionHistoryEntry, MissionPhase, MissionSessionStatus } from "./types";

const HISTORY_KEY = "forgeos-mission-control-history";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function entryId(): string {
  return `hist-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createHistoryEntry(
  action: string,
  phase: MissionPhase,
  sessionStatus: MissionSessionStatus,
  detail?: string
): MissionHistoryEntry {
  return {
    id: entryId(),
    timestamp: new Date().toISOString(),
    action,
    phase,
    sessionStatus,
    detail,
  };
}

export function readMissionHistory(missionId: string): MissionHistory {
  if (!isBrowser()) return { missionId, entries: [] };
  try {
    const raw = localStorage.getItem(`${HISTORY_KEY}-${missionId}`);
    if (!raw) return { missionId, entries: [] };
    return JSON.parse(raw) as MissionHistory;
  } catch {
    return { missionId, entries: [] };
  }
}

export function writeMissionHistory(history: MissionHistory): void {
  if (!isBrowser()) return;
  localStorage.setItem(`${HISTORY_KEY}-${history.missionId}`, JSON.stringify(history));
}

export function appendHistoryEntry(
  missionId: string,
  action: string,
  phase: MissionPhase,
  sessionStatus: MissionSessionStatus,
  detail?: string
): MissionHistory {
  const history = readMissionHistory(missionId);
  const entry = createHistoryEntry(action, phase, sessionStatus, detail);
  const updated: MissionHistory = {
    missionId,
    entries: [...history.entries, entry],
  };
  writeMissionHistory(updated);
  return updated;
}

export function historySummary(history: MissionHistory): string[] {
  return history.entries.slice(-10).map((e) => `${e.timestamp.slice(11, 19)} — ${e.action}`);
}
