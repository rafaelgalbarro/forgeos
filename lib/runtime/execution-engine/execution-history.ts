/** ForgeOS Execution Engine — execution / worker / task history (Epic 4.5). */

import type { ExecutionSession } from "./types";

export interface ExecutionHistoryEntry {
  sessionId: string;
  ventureId: string;
  workerId: string;
  taskId: string;
  taskType: string;
  status: string;
  durationMs: number | null;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface WorkerHistoryEntry {
  workerId: string;
  ventureId: string;
  taskId: string;
  taskType: string;
  sessionId: string;
  success: boolean;
  durationMs: number;
  timestamp: string;
}

export interface TaskHistoryEntry {
  taskId: string;
  ventureId: string;
  workerId: string;
  sessionId: string;
  status: string;
  durationMs: number;
  timestamp: string;
}

export class ExecutionHistoryStore {
  private executions: ExecutionHistoryEntry[] = [];
  private workers: WorkerHistoryEntry[] = [];
  private tasks: TaskHistoryEntry[] = [];

  recordSession(session: ExecutionSession, success: boolean): void {
    this.executions.unshift({
      sessionId: session.sessionId,
      ventureId: session.ventureId,
      workerId: session.workerId,
      taskId: session.taskId,
      taskType: session.taskType,
      status: session.status,
      durationMs: session.duration,
      timestamp: session.finishedAt ?? session.startedAt,
      success,
      error: session.errors[0],
    });

    if (session.duration !== null) {
      this.workers.unshift({
        workerId: session.workerId,
        ventureId: session.ventureId,
        taskId: session.taskId,
        taskType: session.taskType,
        sessionId: session.sessionId,
        success,
        durationMs: session.duration,
        timestamp: session.finishedAt ?? session.startedAt,
      });

      this.tasks.unshift({
        taskId: session.taskId,
        ventureId: session.ventureId,
        workerId: session.workerId,
        sessionId: session.sessionId,
        status: session.status,
        durationMs: session.duration,
        timestamp: session.finishedAt ?? session.startedAt,
      });
    }

    const cap = 500;
    if (this.executions.length > cap) this.executions.length = cap;
    if (this.workers.length > cap) this.workers.length = cap;
    if (this.tasks.length > cap) this.tasks.length = cap;
  }

  getExecutions(ventureId?: string, limit = 50): ExecutionHistoryEntry[] {
    const list = ventureId
      ? this.executions.filter((e) => e.ventureId === ventureId)
      : this.executions;
    return list.slice(0, limit);
  }

  getWorkerHistory(workerId?: string, limit = 50): WorkerHistoryEntry[] {
    const list = workerId
      ? this.workers.filter((e) => e.workerId === workerId)
      : this.workers;
    return list.slice(0, limit);
  }

  getTaskHistory(taskId?: string, limit = 50): TaskHistoryEntry[] {
    const list = taskId
      ? this.tasks.filter((e) => e.taskId === taskId)
      : this.tasks;
    return list.slice(0, limit);
  }

  clear(): void {
    this.executions = [];
    this.workers = [];
    this.tasks = [];
  }
}
