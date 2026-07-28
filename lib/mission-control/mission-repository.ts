/** PROGRAM 5150 — Repository pattern for mission persistence (localStorage adapter). */

import type { Mission, MissionSession, MissionHistory } from "./types";
import {
  readAllMissions,
  saveMission,
  createNewMission,
  getMissionById,
  getActiveMissionId,
  setActiveMissionId,
  getMissionCount,
  ensureSnapshots,
} from "./mission-persistence";
import { missionToSession, sessionToMission } from "./mission-session";
import { readMissionHistory, writeMissionHistory } from "./mission-history";

export interface MissionRepository {
  findById(id: string): MissionSession | null;
  findAll(): MissionSession[];
  save(session: MissionSession): void;
  create(idea?: string): MissionSession;
  getActiveId(): string | null;
  setActiveId(id: string | null): void;
  count(): number;
  getHistory(missionId: string): MissionHistory;
  appendHistory(history: MissionHistory): void;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

class LocalStorageMissionRepository implements MissionRepository {
  findById(id: string): MissionSession | null {
    const mission = getMissionById(id);
    if (!mission) return null;
    return missionToSession(ensureSnapshots(mission));
  }

  findAll(): MissionSession[] {
    return readAllMissions().map((m) => missionToSession(ensureSnapshots(m)));
  }

  save(session: MissionSession): void {
    const mission = sessionToMission(session);
    saveMission(ensureSnapshots(mission));
  }

  create(idea?: string): MissionSession {
    const mission = createNewMission(idea);
    return missionToSession(ensureSnapshots(mission));
  }

  getActiveId(): string | null {
    return getActiveMissionId();
  }

  setActiveId(id: string | null): void {
    setActiveMissionId(id);
  }

  count(): number {
    return getMissionCount();
  }

  getHistory(missionId: string): MissionHistory {
    return readMissionHistory(missionId);
  }

  appendHistory(history: MissionHistory): void {
    writeMissionHistory(history);
  }
}

let _repo: MissionRepository | null = null;

export function getMissionRepository(): MissionRepository {
  if (!_repo) _repo = new LocalStorageMissionRepository();
  return _repo;
}

/** Server-safe: load mission as legacy Mission type */
export function loadMission(id: string): Mission | null {
  if (!isBrowser()) return null;
  return getMissionById(id) ?? null;
}

/** Bridge: persist Mission via repository */
export function persistMission(mission: Mission): MissionSession {
  const repo = getMissionRepository();
  const session = missionToSession(mission);
  repo.save(session);
  return session;
}

/** Bridge: load or create session */
export function loadOrCreateSession(missionId?: string, idea?: string): MissionSession {
  const repo = getMissionRepository();
  if (missionId) {
    const existing = repo.findById(missionId);
    if (existing) return existing;
  }
  return repo.create(idea);
}
