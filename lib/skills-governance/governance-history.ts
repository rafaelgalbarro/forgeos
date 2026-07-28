/** ForgeOS Skills Governance — History (RC4.1). */

import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import type { GovernanceResult, RiskLevel } from "./types";

export interface GovernanceHistoryEntry {
  id: string;
  timestamp: string;
  skillId: string;
  ventureId: string;
  action: string;
  requestedBy: string;
  governancePassed: boolean;
  riskLevel: RiskLevel;
  blockedReason?: string;
  latencyMs: number;
}

export function appendGovernanceHistory(
  entry: Omit<GovernanceHistoryEntry, "id" | "timestamp">
): GovernanceHistoryEntry {
  const record: GovernanceHistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const history = readStorage<GovernanceHistoryEntry[]>(STORAGE_KEYS.skillGovernanceHistory, []);
  history.unshift(record);
  writeStorage(STORAGE_KEYS.skillGovernanceHistory, history.slice(0, 500));
  return record;
}

export function getGovernanceHistory(ventureId?: string): GovernanceHistoryEntry[] {
  const history = readStorage<GovernanceHistoryEntry[]>(STORAGE_KEYS.skillGovernanceHistory, []);
  return ventureId ? history.filter((h) => h.ventureId === ventureId) : history;
}

export function recordFromGovernanceResult(
  result: GovernanceResult,
  skillId: string,
  ventureId: string,
  action: string,
  requestedBy: string
): GovernanceHistoryEntry {
  return appendGovernanceHistory({
    skillId,
    ventureId,
    action,
    requestedBy,
    governancePassed: result.governancePassed,
    riskLevel: result.risk.level,
    blockedReason: result.blockedReason,
    latencyMs: result.latencyMs,
  });
}
