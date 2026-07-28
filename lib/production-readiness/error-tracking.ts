/** Program 6500 — Error log aggregation */

import { readStorage, writeStorage } from "@/lib/beta-platform/storage";
import { PRODUCTION_STORAGE_KEYS } from "./config";
import type { AlertSeverity, ErrorLogEntry } from "./types";

function generateId(): string {
  return `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listErrorLogs(): ErrorLogEntry[] {
  return readStorage<ErrorLogEntry[]>(PRODUCTION_STORAGE_KEYS.errorLog, []);
}

export function recordError(input: {
  message: string;
  source: string;
  severity?: AlertSeverity;
}): ErrorLogEntry {
  const all = listErrorLogs();
  const existing = all.find(
    (e) => e.message === input.message && e.source === input.source
  );

  if (existing) {
    existing.count += 1;
    existing.timestamp = new Date().toISOString();
    writeStorage(PRODUCTION_STORAGE_KEYS.errorLog, all);
    return existing;
  }

  const entry: ErrorLogEntry = {
    id: generateId(),
    message: input.message,
    source: input.source,
    severity: input.severity ?? "error",
    timestamp: new Date().toISOString(),
    count: 1,
  };
  all.unshift(entry);
  writeStorage(PRODUCTION_STORAGE_KEYS.errorLog, all.slice(0, 500));
  return entry;
}

export function clearErrorLogs(): void {
  writeStorage(PRODUCTION_STORAGE_KEYS.errorLog, []);
}

export function seedDemoErrors(): ErrorLogEntry[] {
  if (listErrorLogs().length > 0) return listErrorLogs();
  recordError({ message: "Provider timeout (stub)", source: "ai-runtime", severity: "warning" });
  recordError({ message: "Build pipeline dry-run warning", source: "build-pipeline", severity: "info" });
  return listErrorLogs();
}
