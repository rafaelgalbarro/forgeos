/** Task queue with statuses and incremental progress. */

import type { MissionTask, TaskStatus } from "./types";

const MAX_TASKS = 30;

function taskId(): string {
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createTask(label: string, department?: string, status: TaskStatus = "Queued"): MissionTask {
  const now = nowIso();
  return {
    id: taskId(),
    label,
    department,
    status,
    progress: status === "Completed" ? 100 : status === "Running" ? 10 : 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function enqueueTask(tasks: MissionTask[], label: string, department?: string): MissionTask[] {
  const task = createTask(label, department);
  return [task, ...tasks].slice(0, MAX_TASKS);
}

export function updateTaskStatus(
  tasks: MissionTask[],
  taskId: string,
  status: TaskStatus,
  progress?: number
): MissionTask[] {
  return tasks.map((t) =>
    t.id === taskId
      ? {
          ...t,
          status,
          progress: progress ?? (status === "Completed" ? 100 : status === "Running" ? Math.min(t.progress + 25, 90) : t.progress),
          updatedAt: nowIso(),
        }
      : t
  );
}

export function advanceRunningTasks(tasks: MissionTask[]): MissionTask[] {
  let updated = [...tasks];
  const running = updated.find((t) => t.status === "Running");
  if (running) {
    const newProgress = Math.min(running.progress + 30, 100);
    if (newProgress >= 100) {
      updated = updateTaskStatus(updated, running.id, "Completed", 100);
      const nextQueued = updated.find((t) => t.status === "Queued");
      if (nextQueued) {
        updated = updateTaskStatus(updated, nextQueued.id, "Running", 10);
      }
    } else {
      updated = updateTaskStatus(updated, running.id, "Running", newProgress);
    }
  } else {
    const nextQueued = updated.find((t) => t.status === "Queued");
    if (nextQueued) {
      updated = updateTaskStatus(updated, nextQueued.id, "Running", 10);
    }
  }
  return updated;
}

export function startNextQueued(tasks: MissionTask[]): MissionTask[] {
  const hasRunning = tasks.some((t) => t.status === "Running");
  if (hasRunning) return tasks;
  const next = tasks.find((t) => t.status === "Queued");
  if (!next) return tasks;
  return updateTaskStatus(tasks, next.id, "Running", 10);
}

export function queueFromExecutionSteps(
  labels: string[],
  departments: string[]
): MissionTask[] {
  return labels.map((label, i) => {
    const status: TaskStatus = i === 0 ? "Running" : "Queued";
    return createTask(label, departments[i] ?? "CEO", status);
  });
}

/** PROGRAM 5500 — assign worker to next queued task. */
export function assignWorkerToNextTask(
  tasks: MissionTask[],
  workerDepartment?: string
): MissionTask[] {
  const scheduled = startNextQueued(tasks);
  const running = scheduled.find((t) => t.status === "Running");
  if (!running || !workerDepartment) return scheduled;
  return scheduled.map((t) =>
    t.id === running.id ? { ...t, department: workerDepartment, updatedAt: nowIso() } : t
  );
}

export function estimateQueueEtaSeconds(tasks: MissionTask[], avgSeconds = 8): number {
  const pending = tasks.filter((t) => t.status !== "Completed");
  const running = pending.find((t) => t.status === "Running");
  let eta = pending.filter((t) => t.status === "Queued").length * avgSeconds;
  if (running) {
    eta += Math.ceil(((100 - running.progress) / 100) * avgSeconds);
  }
  return eta;
}

/** PROGRAM 5300 — mark task failed without breaking queue. */
export function markTaskFailed(tasks: MissionTask[], taskId: string): MissionTask[] {
  return updateTaskStatus(tasks, taskId, "Failed", 0);
}

/** PROGRAM 5300 — retry failed task by re-queuing. */
export function retryTask(tasks: MissionTask[], taskId: string): MissionTask[] {
  return tasks.map((t) =>
    t.id === taskId && t.status === "Failed"
      ? { ...t, status: "Queued", progress: 0, updatedAt: nowIso() }
      : t
  );
}
