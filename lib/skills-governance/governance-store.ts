/** ForgeOS Skills Governance — store (RC4.1). */

import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import type {
  ApprovalQueueItem,
  GovernanceAuditRecord,
  GovernanceTelemetryRecord,
} from "./types";

export function appendApprovalQueue(
  item: Omit<ApprovalQueueItem, "id" | "createdAt">
): ApprovalQueueItem {
  const entry: ApprovalQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const queue = readStorage<ApprovalQueueItem[]>(STORAGE_KEYS.skillGovernanceApprovals, []);
  queue.unshift(entry);
  writeStorage(STORAGE_KEYS.skillGovernanceApprovals, queue.slice(0, 200));
  return entry;
}

export function updateApprovalQueueItem(
  id: string,
  status: ApprovalQueueItem["status"]
): void {
  const queue = readStorage<ApprovalQueueItem[]>(STORAGE_KEYS.skillGovernanceApprovals, []);
  const idx = queue.findIndex((q) => q.id === id);
  if (idx >= 0) {
    queue[idx] = { ...queue[idx]!, status };
    writeStorage(STORAGE_KEYS.skillGovernanceApprovals, queue);
  }
}

export function getApprovalQueue(): ApprovalQueueItem[] {
  return readStorage<ApprovalQueueItem[]>(STORAGE_KEYS.skillGovernanceApprovals, []);
}

export function appendGovernanceAudit(
  record: Omit<GovernanceAuditRecord, "id" | "timestamp">
): GovernanceAuditRecord {
  const entry: GovernanceAuditRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const logs = readStorage<GovernanceAuditRecord[]>(STORAGE_KEYS.skillGovernanceAudit, []);
  logs.unshift(entry);
  writeStorage(STORAGE_KEYS.skillGovernanceAudit, logs.slice(0, 1000));
  return entry;
}

export function getGovernanceAuditLog(ventureId?: string): GovernanceAuditRecord[] {
  const logs = readStorage<GovernanceAuditRecord[]>(STORAGE_KEYS.skillGovernanceAudit, []);
  return ventureId ? logs.filter((l) => l.ventureId === ventureId) : logs;
}

export function appendGovernanceTelemetry(
  record: Omit<GovernanceTelemetryRecord, "id" | "timestamp">
): GovernanceTelemetryRecord {
  const entry: GovernanceTelemetryRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const records = readStorage<GovernanceTelemetryRecord[]>(STORAGE_KEYS.skillGovernanceTelemetry, []);
  records.unshift(entry);
  writeStorage(STORAGE_KEYS.skillGovernanceTelemetry, records.slice(0, 1000));
  return entry;
}

export function getGovernanceTelemetry(): GovernanceTelemetryRecord[] {
  return readStorage<GovernanceTelemetryRecord[]>(STORAGE_KEYS.skillGovernanceTelemetry, []);
}
