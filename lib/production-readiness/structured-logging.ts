/** Program 6500 — Structured log format helpers */

import { isStructuredLoggingEnabled } from "./config";

export interface StructuredLogEntry {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  timestamp: string;
  service: string;
  traceId?: string;
  spanId?: string;
  metadata?: Record<string, unknown>;
}

export function formatStructuredLog(
  level: StructuredLogEntry["level"],
  message: string,
  options?: {
    service?: string;
    traceId?: string;
    spanId?: string;
    metadata?: Record<string, unknown>;
  }
): StructuredLogEntry | string {
  const entry: StructuredLogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: options?.service ?? "forgeos-production",
    traceId: options?.traceId,
    spanId: options?.spanId,
    metadata: options?.metadata,
  };

  if (!isStructuredLoggingEnabled()) {
    return `[${entry.timestamp}] ${level.toUpperCase()} ${entry.service}: ${message}`;
  }

  return entry;
}

export function serializeLog(entry: StructuredLogEntry | string): string {
  if (typeof entry === "string") return entry;
  return JSON.stringify(entry);
}
