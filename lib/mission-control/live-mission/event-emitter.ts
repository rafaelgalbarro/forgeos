/** PROGRAM 5300/5400/5500 — Live mission event emitter (non-blocking). */

import type { Mission, MissionPhase } from "../types";
import type { ExecutiveBoardSession, ExecutiveSummary } from "../executive-board/types";
import type { MissionEvent, MissionEventType, LiveMissionState } from "./types";
import { createEmptyLiveMissionState } from "./live-mission-snapshot";
import { appendLog } from "./mission-logs";
import { routeFeedEvent } from "./mission-feed";
import { syncDepartmentActivityFromMission, createDefaultDepartmentActivity } from "./department-activity";
import { combinedProgress } from "./mission-progress";
import { executionProgressPercent } from "../live-execution";
import { advanceRunningTasks } from "./mission-queue";

export type LiveMissionBoardEventType =
  | "executive_board_reviewing"
  | "executive_summary_ready";

export interface LiveMissionBoardEvent {
  id: string;
  type: LiveMissionBoardEventType;
  timestamp: string;
  label: string;
  labelEn: string;
  sessionId?: string;
  summary?: Pick<ExecutiveSummary, "finalRecommendation" | "confidence">;
}

type MissionEventListener = (event: MissionEvent) => void;
type BoardEventListener = (event: LiveMissionBoardEvent) => void;

const missionListeners = new Set<MissionEventListener>();
const boardListeners = new Set<BoardEventListener>();

function missionEventId(): string {
  return `me-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

function boardEventId(): string {
  return `lme-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

function feedSourceForType(type: MissionEventType): "research" | "build" | "deployment" | null {
  switch (type) {
    case "factory_step":
    case "execution":
    case "worker_start":
    case "worker_complete":
    case "task_progress":
    case "task_complete":
      return "build";
    case "deploy_stub":
    case "approval_required":
      return "deployment";
    case "discovery":
    case "intention_classified":
    case "gtm":
      return "research";
    default:
      return null;
  }
}

export function ensureLiveMission(mission: Mission): Mission {
  if (mission.liveMission) return mission;
  return {
    ...mission,
    liveMission: createEmptyLiveMissionState(mission.phase),
  };
}

export function registerMissionEventListener(listener: MissionEventListener): () => void {
  missionListeners.add(listener);
  return () => missionListeners.delete(listener);
}

export function subscribeLiveMissionEvents(listener: BoardEventListener): () => void {
  boardListeners.add(listener);
  return () => boardListeners.delete(listener);
}

function notifyMissionListeners(event: MissionEvent): void {
  for (const listener of missionListeners) {
    try {
      listener(event);
    } catch {
      /* non-blocking */
    }
  }
}

function emitBoard(event: LiveMissionBoardEvent): void {
  for (const listener of boardListeners) {
    try {
      listener(event);
    } catch {
      /* non-blocking */
    }
  }
}

export function emitMissionEvent(
  mission: Mission,
  type: MissionEventType,
  label: string,
  extras?: {
    phase?: MissionPhase;
    icon?: string;
    department?: string;
    metadata?: Record<string, string>;
  }
): Mission {
  const base = ensureLiveMission(mission);
  const live = base.liveMission!;

  const event: MissionEvent = {
    id: missionEventId(),
    timestamp: new Date().toISOString(),
    type,
    label,
    ...extras,
    metadata: {
      missionId: mission.id,
      ...(extras?.metadata ?? {}),
    },
  };

  let feeds = {
    researchFeed: live.researchFeed,
    buildFeed: live.buildFeed,
    deploymentFeed: live.deploymentFeed,
  };
  const source = feedSourceForType(type);
  if (source) {
    feeds = routeFeedEvent(feeds, source, label);
  }

  const logs = appendLog(
    live.logs,
    label,
    type === "risk_detected" ? "warn" : type === "approval_resolved" ? "success" : "info"
  );

  const departmentActivity = syncDepartmentActivityFromMission(
    live.departmentActivity.length ? live.departmentActivity : createDefaultDepartmentActivity(),
    mission
  );

  const snapProgress = mission.snapshots.map((s) => s.progress);
  const progressPercent = combinedProgress(
    mission.phase,
    snapProgress,
    executionProgressPercent(mission.liveExecution)
  );

  const updatedLive: LiveMissionState = {
    ...live,
    events: [event, ...live.events].slice(0, 100),
    logs,
    researchFeed: feeds.researchFeed,
    buildFeed: feeds.buildFeed,
    deploymentFeed: feeds.deploymentFeed,
    departmentActivity,
    progressPercent,
    progressPhase: mission.phase,
  };

  notifyMissionListeners(event);
  return { ...base, liveMission: updatedLive };
}

export function emitMissionEventAsync(
  mission: Mission,
  type: MissionEventType,
  label: string,
  extras?: Parameters<typeof emitMissionEvent>[3]
): Mission {
  return emitMissionEvent(mission, type, label, extras);
}

export function syncLiveMissionFromMission(mission: Mission): Mission {
  const base = ensureLiveMission(mission);
  const live = base.liveMission!;
  const departmentActivity = syncDepartmentActivityFromMission(
    live.departmentActivity.length ? live.departmentActivity : createDefaultDepartmentActivity(),
    mission
  );
  const snapProgress = mission.snapshots.map((s) => s.progress);
  const progressPercent = combinedProgress(
    mission.phase,
    snapProgress,
    executionProgressPercent(mission.liveExecution)
  );
  return {
    ...base,
    liveMission: {
      ...live,
      departmentActivity,
      progressPercent,
      progressPhase: mission.phase,
    },
  };
}

export function advanceLiveMissionQueue(mission: Mission): Mission {
  const base = ensureLiveMission(mission);
  const live = base.liveMission!;
  const tasks = advanceRunningTasks(live.tasks);
  return { ...base, liveMission: { ...live, tasks } };
}

/** PROGRAM 5500 — emit autonomous worker/checkpoint/approval events on mission. */
export function emitAutonomousMissionEvent(
  mission: Mission,
  type: MissionEventType,
  label: string,
  extras?: Parameters<typeof emitMissionEvent>[3]
): Mission {
  return emitMissionEvent(mission, type, label, extras);
}

export function emitExecutiveBoardReviewing(session: ExecutiveBoardSession): void {
  emitBoard({
    id: boardEventId(),
    type: "executive_board_reviewing",
    timestamp: new Date().toISOString(),
    label: "El Consejo Ejecutivo está evaluando alternativas…",
    labelEn: "Executive Board Reviewing…",
    sessionId: session.id,
  });
}

export function emitExecutiveSummaryReady(session: ExecutiveBoardSession): void {
  emitBoard({
    id: boardEventId(),
    type: "executive_summary_ready",
    timestamp: new Date().toISOString(),
    label: "Resumen ejecutivo listo",
    labelEn: "Executive Summary ready",
    sessionId: session.id,
    summary: session.summary
      ? {
          finalRecommendation: session.summary.finalRecommendation,
          confidence: session.summary.confidence,
        }
      : undefined,
  });
}

/** PROGRAM 5700 — emit GTM deliverable generated event. */
export function emitGTMDeliverable(mission: Mission, label: string): Mission {
  return emitMissionEvent(mission, "gtm", label, {
    icon: "🚀",
    department: "CMO",
    phase: mission.phase,
  });
}

export function emitGTMPlanReady(mission: Mission): Mission {
  return emitMissionEvent(mission, "gtm", "Plan de lanzamiento GTM completo", {
    icon: "✅",
    department: "CMO",
    phase: mission.phase,
    metadata: { gtmComplete: "true" },
  });
}

/** PROGRAM 5400 — attach board session + emit live mission event. */
export function emitBoardEventToMission(
  mission: Mission,
  session: ExecutiveBoardSession,
  summaryReady: boolean
): Mission {
  const m: Mission = { ...mission, executiveBoard: session };
  if (!summaryReady) {
    return emitMissionEvent(m, "system", `Consejo evaluando: ${session.trigger.label}`, {
      icon: "🏛️",
      department: "CEO",
      phase: mission.phase,
    });
  }
  const conf = session.summary?.confidence ?? 0;
  return emitMissionEvent(m, "decision_resolved", `Resumen ejecutivo listo (${conf}% confianza)`, {
    icon: "📋",
    department: "CEO",
    phase: mission.phase,
    metadata: { sessionId: session.id },
  });
}
