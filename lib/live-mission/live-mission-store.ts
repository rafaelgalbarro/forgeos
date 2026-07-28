/**
 * PROGRAM 5300 — Client-side live mission store.
 * Light polling from persisted mission data — no heavy engine imports.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Mission } from "@/lib/mission-control/types";
import { getMissionById, saveMission } from "@/lib/mission-control/mission-persistence";
import { syncLiveMissionFromMission } from "@/lib/mission-control/live-mission";
import {
  updateTaskStatus,
  enqueueTask,
} from "@/lib/mission-control/live-mission/mission-queue";
import { emitMissionEvent } from "@/lib/mission-control/live-mission/event-emitter";
import type { MissionLogEntry } from "@/lib/mission-control/live-mission/types";
import type { LiveMissionSerializableSnapshot, LiveMissionUIEvent } from "./types";
import { buildSerializableSnapshot } from "./live-mission-snapshot";
import { wireMissionEventAdapter } from "./mission-event-adapter";
import { ensureLiveMissionCanonicalBridge } from "@/src/core/events/adapters/live-mission-bridge";

const DEFAULT_POLL_MS = 2000;

type SnapshotListener = (snapshot: LiveMissionSerializableSnapshot) => void;
type UIEventListener = (event: LiveMissionUIEvent) => void;

const snapshotListeners = new Map<string, Set<SnapshotListener>>();
const uiEventListeners = new Set<UIEventListener>();
let adapterWired = false;

function notifySnapshot(missionId: string, snapshot: LiveMissionSerializableSnapshot): void {
  const listeners = snapshotListeners.get(missionId);
  if (!listeners) return;
  for (const fn of listeners) {
    try {
      fn(snapshot);
    } catch {
      /* non-blocking */
    }
  }
}

function notifyUIEvent(event: LiveMissionUIEvent): void {
  for (const fn of uiEventListeners) {
    try {
      fn(event);
    } catch {
      /* non-blocking */
    }
  }
}

function ensureAdapter(): void {
  if (adapterWired || typeof window === "undefined") return;
  wireMissionEventAdapter(notifyUIEvent);
  // PROGRAM 6040 — mirror real Live Mission events into canonical log (non-destructive)
  ensureLiveMissionCanonicalBridge({
    resolveMissionId: (event) => event.metadata?.missionId ?? "mission:unknown",
  });
  adapterWired = true;
}

/** Read snapshot from persisted mission — server-safe when mission provided. */
export function getLiveMissionSnapshot(missionOrId: Mission | string): LiveMissionSerializableSnapshot | null {
  const mission = typeof missionOrId === "string" ? getMissionById(missionOrId) : missionOrId;
  if (!mission) return null;
  return buildSerializableSnapshot(mission);
}

/** Subscribe to snapshot updates for a mission (client only). */
export function subscribeLiveMissionSnapshot(
  missionId: string,
  listener: SnapshotListener
): () => void {
  ensureAdapter();
  if (!snapshotListeners.has(missionId)) {
    snapshotListeners.set(missionId, new Set());
  }
  snapshotListeners.get(missionId)!.add(listener);
  const snap = getLiveMissionSnapshot(missionId);
  if (snap) listener(snap);
  return () => {
    snapshotListeners.get(missionId)?.delete(listener);
  };
}

/** Subscribe to real-time UI events from event bus adapter. */
export function subscribeLiveMissionUIEvents(listener: UIEventListener): () => void {
  ensureAdapter();
  uiEventListeners.add(listener);
  return () => uiEventListeners.delete(listener);
}

/** Retry a failed task — re-queues without breaking mission. */
export function retryFailedTask(missionId: string, taskId: string): Mission | null {
  const mission = getMissionById(missionId);
  if (!mission) return null;

  let updated = mission;
  const liveTasks = updated.liveMission?.tasks ?? [];
  const autoTasks = updated.autonomous?.tasks ?? [];

  const retryIn = (tasks: typeof liveTasks) =>
    tasks.map((t) =>
      t.id === taskId && t.status === "Failed"
        ? { ...t, status: "Queued" as const, progress: 0, updatedAt: new Date().toISOString() }
        : t
    );

  if (liveTasks.some((t) => t.id === taskId)) {
    updated = {
      ...updated,
      liveMission: {
        ...(updated.liveMission ?? { tasks: [], events: [], researchFeed: [], buildFeed: [], deploymentFeed: [], departmentActivity: [], logs: [], progressPercent: 0, progressPhase: updated.phase }),
        tasks: retryIn(liveTasks),
      },
    };
  }

  if (autoTasks.some((t) => t.id === taskId) && updated.autonomous) {
    updated = {
      ...updated,
      autonomous: {
        ...updated.autonomous,
        tasks: retryIn(autoTasks),
        status: "running",
      },
    };
  }

  updated = emitMissionEvent(updated, "queue_updated", `Reintento: tarea ${taskId.slice(-6)}`, {
    department: "CEO",
    phase: updated.phase,
    icon: "🔄",
  });
  updated = syncLiveMissionFromMission(updated);
  saveMission(updated);

  const snap = buildSerializableSnapshot(updated);
  notifySnapshot(missionId, snap);
  return updated;
}

/** Controlled failure for a running task (lab / test flows). */
export function failTaskControlled(missionId: string, taskId: string, reason: string): Mission | null {
  const mission = getMissionById(missionId);
  if (!mission) return null;

  let updated = mission;
  const failIn = (tasks: import("@/lib/mission-control/live-mission/types").MissionTask[]) =>
    updateTaskStatus(tasks, taskId, "Failed", 0);

  if (updated.liveMission?.tasks.some((t) => t.id === taskId)) {
    updated = {
      ...updated,
      liveMission: {
        ...updated.liveMission!,
        tasks: failIn(updated.liveMission!.tasks),
        logs: (
          [
            { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), level: "error", message: reason } satisfies MissionLogEntry,
            ...updated.liveMission!.logs,
          ] as MissionLogEntry[]
        ).slice(0, 50),
      },
    };
  }

  if (updated.autonomous?.tasks.some((t) => t.id === taskId)) {
    updated = {
      ...updated,
      autonomous: { ...updated.autonomous, tasks: failIn(updated.autonomous.tasks) },
    };
  }

  updated = emitMissionEvent(updated, "risk_detected", reason, {
    department: "CEO",
    phase: updated.phase,
    icon: "⚠️",
  });
  updated = syncLiveMissionFromMission(updated);
  saveMission(updated);
  notifySnapshot(missionId, buildSerializableSnapshot(updated));
  return updated;
}

/** Enqueue a demo task for NEXORA FIELD verification flows. */
export function enqueueDemoTask(missionId: string, label: string, department?: string): Mission | null {
  const mission = getMissionById(missionId);
  if (!mission) return null;

  const live = mission.liveMission ?? {
    tasks: [],
    events: [],
    researchFeed: [],
    buildFeed: [],
    deploymentFeed: [],
    departmentActivity: [],
    logs: [],
    progressPercent: 0,
    progressPhase: mission.phase,
  };

  const tasks = enqueueTask(live.tasks, label, department);
  let updated = emitMissionEvent(
    { ...mission, liveMission: { ...live, tasks } },
    "queue_updated",
    label,
    { department, phase: mission.phase }
  );
  updated = syncLiveMissionFromMission(updated);
  saveMission(updated);
  notifySnapshot(missionId, buildSerializableSnapshot(updated));
  return updated;
}

/** React hook — light polling, non-blocking. */
export function useLiveMissionSnapshot(
  missionId: string | undefined,
  pollMs = DEFAULT_POLL_MS
): LiveMissionSerializableSnapshot | null {
  const [snapshot, setSnapshot] = useState<LiveMissionSerializableSnapshot | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(() => {
    if (!missionId) return;
    const snap = getLiveMissionSnapshot(missionId);
    if (snap) setSnapshot(snap);
  }, [missionId]);

  useEffect(() => {
    if (!missionId) return;
    ensureAdapter();
    refresh();
    const unsub = subscribeLiveMissionSnapshot(missionId, setSnapshot);
    pollRef.current = setInterval(refresh, pollMs);
    return () => {
      unsub();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [missionId, pollMs, refresh]);

  return snapshot;
}
