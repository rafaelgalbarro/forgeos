/** ForgeOS Execution Engine — internal lifecycle events (Epic 4.5). */

import type { ExecutionPipelineState } from "./execution-status";

export type ExecutionInternalEventType =
  | "pipeline_transition"
  | "worker_unavailable"
  | "validation_failed"
  | "memory_written"
  | "decision_written"
  | "telemetry_recorded"
  | "retry_scheduled"
  | "dead_letter";

export interface ExecutionInternalEvent {
  type: ExecutionInternalEventType;
  timestamp: string;
  sessionId: string;
  detail?: string;
  fromState?: ExecutionPipelineState;
  toState?: ExecutionPipelineState;
}

export class ExecutionEventEmitter {
  private events: ExecutionInternalEvent[] = [];

  emit(event: Omit<ExecutionInternalEvent, "timestamp"> & { timestamp?: string }): void {
    this.events.push({
      ...event,
      timestamp: event.timestamp ?? new Date().toISOString(),
    });
  }

  list(sessionId?: string, limit = 100): ExecutionInternalEvent[] {
    let result = this.events;
    if (sessionId) {
      result = result.filter((e) => e.sessionId === sessionId);
    }
    return result.slice(-limit);
  }

  clear(): void {
    this.events = [];
  }
}
