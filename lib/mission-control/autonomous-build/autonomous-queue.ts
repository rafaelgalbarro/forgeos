/** Extend mission-queue with worker scheduling + ETA estimation. */

import type { MissionTask } from "../live-mission/types";
import type { MissionPhase } from "../types";
import {
  queueFromExecutionSteps,
  startNextQueued,
  enqueueTask,
  createTask,
} from "../live-mission/mission-queue";
import { factoryProgressSteps } from "../smart-routing";
import type { IntentionType } from "../types";
import { MISSION_PHASE_ORDER } from "../mission-flow";

const AVG_TASK_SECONDS = 8;
const PHASE_MULTIPLIER: Record<MissionPhase, number> = {
  UNDERSTAND: 1,
  PLAN: 1.2,
  BUILD: 1.5,
  VALIDATE: 1,
  DEPLOY: 1.3,
  OPERATE: 0.8,
  EVOLVE: 0.5,
};

export function buildAutonomousQueue(
  intention: IntentionType,
  phase: MissionPhase
): MissionTask[] {
  const steps = factoryProgressSteps(intention);
  const phaseTasks = MISSION_PHASE_ORDER.slice(
    MISSION_PHASE_ORDER.indexOf(phase),
    MISSION_PHASE_ORDER.indexOf(phase) + 2
  ).map((p) => createTask(`Fase ${p}`, "CEO", "Queued"));

  const execTasks = queueFromExecutionSteps(steps, steps.map((s) => s.split(" ")[0]));
  return [...execTasks, ...phaseTasks].slice(0, 20);
}

export function scheduleNextTask(tasks: MissionTask[]): MissionTask[] {
  const hasRunning = tasks.some((t) => t.status === "Running");
  if (hasRunning) return tasks;
  return startNextQueued(tasks);
}

export function estimateEtaSeconds(tasks: MissionTask[], phase: MissionPhase): number {
  const pending = tasks.filter((t) => t.status !== "Completed");
  const running = pending.find((t) => t.status === "Running");
  const queued = pending.filter((t) => t.status === "Queued");

  let eta = 0;
  if (running) {
    const remaining = Math.max(0, 100 - running.progress);
    eta += Math.ceil((remaining / 100) * AVG_TASK_SECONDS);
  }
  eta += queued.length * AVG_TASK_SECONDS;
  return Math.ceil(eta * (PHASE_MULTIPLIER[phase] ?? 1));
}

export function getCurrentTask(tasks: MissionTask[]): MissionTask | undefined {
  return tasks.find((t) => t.status === "Running") ?? tasks.find((t) => t.status === "Waiting");
}

export function getNextTask(tasks: MissionTask[]): MissionTask | undefined {
  const running = tasks.find((t) => t.status === "Running");
  if (running) {
    return tasks.find((t) => t.status === "Queued" && t.id !== running.id);
  }
  return tasks.find((t) => t.status === "Queued");
}

export function getCompletedTasks(tasks: MissionTask[]): MissionTask[] {
  return tasks.filter((t) => t.status === "Completed");
}

export function appendQueueTask(
  tasks: MissionTask[],
  label: string,
  department?: string
): MissionTask[] {
  return enqueueTask(tasks, label, department);
}

export function isQueueComplete(tasks: MissionTask[]): boolean {
  return tasks.length > 0 && tasks.every((t) => t.status === "Completed");
}
