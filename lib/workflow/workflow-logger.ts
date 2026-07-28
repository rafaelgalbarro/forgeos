import type { WorkflowEvent } from "./events";

export type WorkflowLogLevel = "info" | "warn" | "error";

export interface WorkflowLogEntry {
  level: WorkflowLogLevel;
  message: string;
  event?: WorkflowEvent;
  timestamp: string;
}

export interface WorkflowLogger {
  info(message: string, event?: WorkflowEvent): void;
  warn(message: string, event?: WorkflowEvent): void;
  error(message: string, event?: WorkflowEvent): void;
  getEntries(): WorkflowLogEntry[];
  clear(): void;
}

export function createWorkflowLogger(): WorkflowLogger {
  const entries: WorkflowLogEntry[] = [];

  function log(level: WorkflowLogLevel, message: string, event?: WorkflowEvent) {
    entries.push({ level, message, event, timestamp: new Date().toISOString() });
    if (process.env.NODE_ENV === "development") {
      const prefix = `[workflow:${level}]`;
      console.debug(prefix, message, event?.type ?? "");
    }
  }

  return {
    info: (message, event) => log("info", message, event),
    warn: (message, event) => log("warn", message, event),
    error: (message, event) => log("error", message, event),
    getEntries: () => [...entries],
    clear: () => { entries.length = 0; },
  };
}

/** Default singleton for client-side orchestration. */
export const workflowLogger = createWorkflowLogger();
