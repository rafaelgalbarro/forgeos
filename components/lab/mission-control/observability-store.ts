/** In-memory observability log for Mission Control (Epic 3.2.2). */

import type { ExecutiveRuntimeLabResult } from "@/lib/lab/executive-runtime-lab";
import type { ObservabilityEntry } from "./types";

const sessionLog: ObservabilityEntry[] = [];

export function registerMissionControlRun(result: ExecutiveRuntimeLabResult): ObservabilityEntry {
  const entry: ObservabilityEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    task: "EXECUTIVE_RUNTIME",
    provider: result.provider ?? result.runtime?.provider ?? "—",
    runtime: result.runtime?.source ?? "—",
    sessionId: result.boardSession?.sessionId ?? result.runtime?.boardSessionId,
    decisionId: result.runtime?.decisionId,
    latencyMs: result.latencyMs,
    costEstimate: result.observations.reduce((sum, o) => sum + o.costEstimate, 0),
    confidence: result.consensus?.confidence ?? result.ceoBrief?.confidence,
    errors: result.error ? [result.error] : [],
    warnings: result.warnings,
  };
  sessionLog.unshift(entry);
  return entry;
}

export function getMissionControlLog(): ObservabilityEntry[] {
  return [...sessionLog];
}

export function clearMissionControlLog(): void {
  sessionLog.length = 0;
}
