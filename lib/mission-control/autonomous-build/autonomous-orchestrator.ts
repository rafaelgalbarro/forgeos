/** Main autonomous loop — dequeue → run → checkpoint → continue or pause. */

import type { AutonomousState, AutonomousTickResult, AutonomousPanelView } from "./types";
import type { Mission, MissionPhase } from "../types";
import { createWorkers, advanceWorkerTask, startWorkerOnTask } from "./mission-workers";
import {
  scheduleNextTask,
  estimateEtaSeconds,
  getCurrentTask,
  getNextTask,
  getCompletedTasks,
  buildAutonomousQueue,
  isQueueComplete,
} from "./autonomous-queue";
import { createCheckpoint, saveCheckpoint, shouldCheckpoint } from "./mission-checkpoints";
import { checkTaskForApproval, resolveApproval } from "./mission-approval";
import { canAutonomousRun, pauseAutonomous } from "./mission-pause";
import { requiresApproval } from "./approval-gates";
import { emitAutonomousMissionEvent } from "../live-mission/event-emitter";
import { advancePhase } from "../mission-flow";
import { ensureLiveMission } from "../live-mission/event-emitter";

function nowIso(): string {
  return new Date().toISOString();
}

export function createAutonomousState(mission: Mission, enabled = true): AutonomousState {
  const tasks =
    mission.autonomous?.tasks?.length
      ? mission.autonomous.tasks
      : mission.intention && mission.intention !== "DISCOVERY"
        ? buildAutonomousQueue(mission.intention, mission.phase)
        : [];

  const scheduled = scheduleNextTask(tasks);

  return {
    status: enabled && scheduled.length ? "running" : "idle",
    enabled,
    pausedByUser: false,
    tasks: scheduled,
    currentTaskId: scheduled.find((t) => t.status === "Running")?.id,
    completedTaskIds: mission.autonomous?.completedTaskIds ?? [],
    checkpoints: mission.autonomous?.checkpoints ?? [],
    etaSeconds: estimateEtaSeconds(scheduled, mission.phase),
    workers: createWorkers(mission.intention),
    updatedAt: nowIso(),
  };
}

export function setAutonomousEnabled(
  mission: Mission,
  state: AutonomousState,
  enabled: boolean
): { mission: Mission; state: AutonomousState } {
  const updated: AutonomousState = {
    ...state,
    enabled,
    status: enabled ? (state.tasks.length ? "running" : "idle") : "idle",
    pausedByUser: !enabled,
    updatedAt: nowIso(),
  };
  const m = emitAutonomousMissionEvent(
    mission,
    enabled ? "autonomous_resumed" : "autonomous_paused",
    enabled ? "Modo autónomo activado" : "Modo autónomo desactivado"
  );
  return { mission: m, state: updated };
}

const lastPhaseByMission = new Map<string, MissionPhase>();

export function tickAutonomous(mission: Mission, state: AutonomousState): {
  mission: Mission;
  state: AutonomousState;
  result: AutonomousTickResult;
} {
  if (!canAutonomousRun(state)) {
    return { mission, state, result: { state } };
  }

  if (state.status === "awaiting_approval" && state.pendingApproval) {
    return { mission, state, result: { state, needsApproval: state.pendingApproval } };
  }

  let currentState = { ...state };
  let currentMission = ensureLiveMission(mission);

  const running = getCurrentTask(currentState.tasks);
  if (running && requiresApproval(running, currentMission.phase) && running.progress === 0) {
    const approvalCheck = checkTaskForApproval(currentMission, currentState);
    if (approvalCheck.gate) {
      return {
        mission: approvalCheck.mission,
        state: approvalCheck.state,
        result: { state: approvalCheck.state, needsApproval: approvalCheck.gate },
      };
    }
    currentState = approvalCheck.state;
    currentMission = approvalCheck.mission;
  }

  if (!running) {
    const scheduled = scheduleNextTask(currentState.tasks);
    currentState = {
      ...currentState,
      tasks: scheduled,
      currentTaskId: scheduled.find((t) => t.status === "Running")?.id,
    };
    const next = getCurrentTask(currentState.tasks);
    if (next) {
      const started = startWorkerOnTask(currentMission, currentState.tasks, currentState.workers, next.id);
      currentMission = started.mission;
      currentState = {
        ...currentState,
        tasks: started.tasks,
        workers: started.workers,
        currentTaskId: next.id,
      };
    } else if (isQueueComplete(currentState.tasks)) {
      currentState = {
        ...currentState,
        status: "completed",
        etaSeconds: 0,
        updatedAt: nowIso(),
      };
      return { mission: currentMission, state: currentState, result: { state: currentState, event: "completed" } };
    }
  }

  const active = getCurrentTask(currentState.tasks);
  if (active) {
    const advanced = advanceWorkerTask(currentMission, currentState.tasks, currentState.workers);
    currentMission = advanced.mission;
    currentState = {
      ...currentState,
      tasks: advanced.tasks,
      workers: advanced.workers,
      etaSeconds: estimateEtaSeconds(advanced.tasks, currentMission.phase),
      updatedAt: nowIso(),
    };

    if (advanced.completed) {
      currentState = {
        ...currentState,
        completedTaskIds: [...currentState.completedTaskIds, advanced.completed.id],
      };

      const prevPhase = lastPhaseByMission.get(currentMission.id);
      if (shouldCheckpoint(currentMission.phase, prevPhase)) {
        const cp = createCheckpoint(
          currentMission.id,
          currentMission.phase,
          currentState.completedTaskIds.length,
          currentState.tasks,
          currentState.completedTaskIds
        );
        saveCheckpoint(currentMission.id, cp);
        currentState = {
          ...currentState,
          checkpoints: [cp, ...currentState.checkpoints].slice(0, 20),
          lastCheckpointId: cp.id,
        };
        currentMission = emitAutonomousMissionEvent(
          currentMission,
          "checkpoint_saved",
          `Checkpoint fase ${currentMission.phase}`,
          { phase: currentMission.phase }
        );

        if (currentMission.phase !== "EVOLVE") {
          currentMission = advancePhase(currentMission);
          lastPhaseByMission.set(currentMission.id, currentMission.phase);
        }
      }

      const nextScheduled = scheduleNextTask(currentState.tasks);
      currentState = {
        ...currentState,
        tasks: nextScheduled,
        currentTaskId: nextScheduled.find((t) => t.status === "Running")?.id,
      };
    }
  }

  currentMission = emitAutonomousMissionEvent(currentMission, "queue_updated", "Cola actualizada");
  if (currentMission.liveMission) {
    currentMission = {
      ...currentMission,
      liveMission: { ...currentMission.liveMission, tasks: currentState.tasks },
    };
  }

  return {
    mission: { ...currentMission, autonomous: currentState },
    state: currentState,
    result: { state: currentState, event: "tick" },
  };
}

export function handleApprovalResponse(
  mission: Mission,
  state: AutonomousState,
  approved: boolean
): { mission: Mission; state: AutonomousState } {
  return resolveApproval(mission, state, approved);
}

export function pauseAutonomousLoop(
  mission: Mission,
  state: AutonomousState
): { mission: Mission; state: AutonomousState } {
  return pauseAutonomous(mission, state, true);
}

export function buildPanelView(state: AutonomousState): AutonomousPanelView {
  return {
    currentTask: getCurrentTask(state.tasks),
    completedTasks: getCompletedTasks(state.tasks),
    nextTask: getNextTask(state.tasks),
    etaSeconds: state.etaSeconds,
    status: state.status,
  };
}

export function attachAutonomousState(mission: Mission, state: AutonomousState): Mission {
  return { ...mission, autonomous: state, updatedAt: nowIso() };
}
