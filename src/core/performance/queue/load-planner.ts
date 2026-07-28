/**
 * PROGRAM 6100 — Load planning layer on top of existing Runtime/Scheduler.
 * NOT a parallel scheduler — plans and enforces limits before delegating.
 */

import { canStartExecution, startExecution, endExecution, cancelExecution } from "../concurrency/concurrency-guard";
import type { LoadPlanTask, LoadTaskPriority } from "./task-priority";
import { PRIORITY_ORDER } from "./task-priority";

const taskQueue: LoadPlanTask[] = [];
const runningTasks = new Map<string, LoadPlanTask>();

export function enqueueTask(task: Omit<LoadPlanTask, "enqueuedAt" | "status">): LoadPlanTask {
  const entry: LoadPlanTask = {
    ...task,
    enqueuedAt: new Date().toISOString(),
    status: "PENDING",
  };
  taskQueue.push(entry);
  taskQueue.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  return entry;
}

export function planNextTask(): LoadPlanTask | null {
  for (let i = 0; i < taskQueue.length; i++) {
    const task = taskQueue[i];
    if (task.status !== "PENDING") continue;
    const category = mapPriorityToCategory(task.priority);
    const check = canStartExecution(category, {
      workspaceId: task.workspaceId,
      ventureId: task.ventureId,
    });
    if (check.allowed) return task;
  }
  return null;
}

export function startPlannedTask(taskId: string): boolean {
  const idx = taskQueue.findIndex((t) => t.id === taskId);
  if (idx < 0) return false;
  const task = taskQueue[idx];
  const category = mapPriorityToCategory(task.priority);
  const result = startExecution(taskId, category, {
    workspaceId: task.workspaceId,
    ventureId: task.ventureId,
  });
  if (!result.started) return false;
  task.status = "RUNNING";
  runningTasks.set(taskId, task);
  return true;
}

export function completeTask(taskId: string, success: boolean): void {
  const task = runningTasks.get(taskId);
  if (task) {
    task.status = success ? "COMPLETED" : "FAILED";
    runningTasks.delete(taskId);
  }
  endExecution(taskId);
  const idx = taskQueue.findIndex((t) => t.id === taskId);
  if (idx >= 0) taskQueue.splice(idx, 1);
}

export function pauseTask(taskId: string): boolean {
  const task = runningTasks.get(taskId) || taskQueue.find((t) => t.id === taskId);
  if (!task) return false;
  task.status = "PAUSED";
  return true;
}

export function cancelTask(taskId: string): boolean {
  const task = taskQueue.find((t) => t.id === taskId) || runningTasks.get(taskId);
  if (!task || !task.cancellable) return false;
  task.status = "CANCELLED";
  runningTasks.delete(taskId);
  cancelExecution(taskId);
  const idx = taskQueue.findIndex((t) => t.id === taskId);
  if (idx >= 0) taskQueue.splice(idx, 1);
  return true;
}

export function getQueueSnapshot(): { pending: number; running: number; tasks: LoadPlanTask[] } {
  return {
    pending: taskQueue.filter((t) => t.status === "PENDING").length,
    running: runningTasks.size,
    tasks: [...taskQueue, ...runningTasks.values()],
  };
}

export function resetQueue(): void {
  taskQueue.length = 0;
  runningTasks.clear();
}

function mapPriorityToCategory(priority: LoadTaskPriority) {
  if (priority === "INTERACTIVE" || priority === "HIGH_PRIORITY") return "VENTURE" as const;
  if (priority === "STANDARD") return "WORKSPACE" as const;
  if (priority === "BACKGROUND") return "AI" as const;
  return "GLOBAL" as const;
}
