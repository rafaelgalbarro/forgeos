/** Virtual workers — CEO, Research, CTO, factories. */

import type { MissionWorker, WorkerId } from "./types";
import type { MissionTask } from "../live-mission/types";
import type { IntentionType, Mission } from "../types";
import { updateTaskStatus } from "../live-mission/mission-queue";
import { emitAutonomousMissionEvent } from "../live-mission/event-emitter";

const BASE_WORKERS: Omit<MissionWorker, "busy" | "currentTaskId">[] = [
  { id: "CEO", label: "CEO", department: "CEO" },
  { id: "Research", label: "Research", department: "Research" },
  { id: "CTO", label: "CTO", department: "CTO" },
  { id: "CMO", label: "CMO", department: "CMO" },
  { id: "CFO", label: "CFO", department: "CFO" },
  { id: "Legal", label: "Legal", department: "Legal" },
];

const FACTORY_WORKERS: Record<string, WorkerId> = {
  WEBSITE: "WebsiteFactory",
  APPLICATION: "AppFactory",
  MOBILE: "MobileFactory",
};

function deptToWorker(dept?: string): WorkerId {
  if (!dept) return "CEO";
  const lower = dept.toLowerCase();
  if (lower.includes("research")) return "Research";
  if (lower.includes("cto") || lower.includes("architecture")) return "CTO";
  if (lower.includes("cmo") || lower.includes("brand")) return "CMO";
  if (lower.includes("cfo")) return "CFO";
  if (lower.includes("legal")) return "Legal";
  return "CEO";
}

export function createWorkers(intention?: IntentionType | null): MissionWorker[] {
  const workers = BASE_WORKERS.map((w) => ({ ...w, busy: false }));
  if (intention && FACTORY_WORKERS[intention]) {
    const fid = FACTORY_WORKERS[intention];
    workers.push({
      id: fid,
      label: fid.replace("Factory", " Factory"),
      department: fid,
      busy: false,
    });
  }
  return workers;
}

export function assignWorker(workers: MissionWorker[], task: MissionTask): MissionWorker[] {
  const workerId = deptToWorker(task.department);
  return workers.map((w) =>
    w.id === workerId
      ? { ...w, busy: true, currentTaskId: task.id }
      : { ...w, busy: w.busy && w.currentTaskId !== task.id ? w.busy : false }
  );
}

export function releaseWorker(workers: MissionWorker[], taskId: string): MissionWorker[] {
  return workers.map((w) =>
    w.currentTaskId === taskId ? { ...w, busy: false, currentTaskId: undefined } : w
  );
}

const PROGRESS_STEP = 25;

export function advanceWorkerTask(
  mission: Mission,
  tasks: MissionTask[],
  workers: MissionWorker[]
): { mission: Mission; tasks: MissionTask[]; workers: MissionWorker[]; completed?: MissionTask } {
  const running = tasks.find((t) => t.status === "Running");
  if (!running) return { mission, tasks, workers };

  const newProgress = Math.min(running.progress + PROGRESS_STEP, 100);
  let updatedTasks = tasks;
  let updatedWorkers = workers;
  let updatedMission = mission;

  if (newProgress >= 100) {
    updatedTasks = updateTaskStatus(tasks, running.id, "Completed", 100);
    updatedWorkers = releaseWorker(workers, running.id);
    updatedMission = emitAutonomousMissionEvent(updatedMission, "worker_complete", `${running.label} completado`, {
      department: running.department,
    });
    updatedMission = emitAutonomousMissionEvent(updatedMission, "task_complete", running.label, {
      department: running.department,
    });
    return {
      mission: updatedMission,
      tasks: updatedTasks,
      workers: updatedWorkers,
      completed: running,
    };
  }

  updatedTasks = updateTaskStatus(tasks, running.id, "Running", newProgress);
  updatedMission = emitAutonomousMissionEvent(
    updatedMission,
    "task_progress",
    `${running.label} ${newProgress}%`,
    { department: running.department }
  );
  return { mission: updatedMission, tasks: updatedTasks, workers: updatedWorkers };
}

export function startWorkerOnTask(
  mission: Mission,
  tasks: MissionTask[],
  workers: MissionWorker[],
  taskId: string
): { mission: Mission; tasks: MissionTask[]; workers: MissionWorker[] } {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return { mission, tasks, workers };

  const updatedTasks = updateTaskStatus(tasks, taskId, "Running", 10);
  const updatedWorkers = assignWorker(workers, task);
  const updatedMission = emitAutonomousMissionEvent(mission, "worker_start", `${task.label} en curso`, {
    department: task.department,
  });
  return { mission: updatedMission, tasks: updatedTasks, workers: updatedWorkers };
}
