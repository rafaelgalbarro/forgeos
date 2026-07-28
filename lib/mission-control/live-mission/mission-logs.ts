/** Append-only mission log. */

import type { MissionLogEntry } from "./types";

const MAX_LOGS = 100;

function nowIso(): string {
  return new Date().toISOString();
}

function logId(): string {
  return `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function appendLog(
  logs: MissionLogEntry[],
  message: string,
  level: MissionLogEntry["level"] = "info"
): MissionLogEntry[] {
  const entry: MissionLogEntry = {
    id: logId(),
    timestamp: nowIso(),
    level,
    message,
  };
  return [entry, ...logs].slice(0, MAX_LOGS);
}

export function formatLogTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
