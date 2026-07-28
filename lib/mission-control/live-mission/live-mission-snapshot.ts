/** Lightweight snapshot builder for SSR — no heavy imports. */

import type { LiveMissionSnapshot, LiveMissionState } from "./types";
import type { MissionPhase } from "../types";

export function createEmptyLiveMissionState(phase: MissionPhase = "UNDERSTAND"): LiveMissionState {
  return {
    tasks: [],
    events: [],
    researchFeed: [],
    buildFeed: [],
    deploymentFeed: [],
    departmentActivity: [
      { department: "CEO", status: "waiting", label: "Esperando idea" },
      { department: "Research", status: "idle", label: "En espera" },
      { department: "CTO", status: "idle", label: "En espera" },
      { department: "CMO", status: "idle", label: "En espera" },
      { department: "CFO", status: "idle", label: "En espera" },
      { department: "Legal", status: "idle", label: "En espera" },
    ],
    logs: [],
    progressPercent: 0,
    progressPhase: phase,
  };
}

export function buildLiveMissionSnapshot(
  missionId: string,
  state?: Partial<LiveMissionState>
): LiveMissionSnapshot {
  const base = createEmptyLiveMissionState();
  return {
    missionId,
    generatedAt: new Date().toISOString(),
    state: { ...base, ...state },
  };
}
