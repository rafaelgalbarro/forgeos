/** Program 6000 — Commercial audit trail */

import { readStorage, writeStorage } from "@/lib/beta-platform/storage";
import { COMMERCIAL_STORAGE_KEYS } from "./config";
import type { CommercialAuditEntry } from "./types";

function uid(): string {
  return `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readAudit(): CommercialAuditEntry[] {
  return readStorage<CommercialAuditEntry[]>(COMMERCIAL_STORAGE_KEYS.auditLogs, []);
}

function writeAudit(entries: CommercialAuditEntry[]): void {
  writeStorage(COMMERCIAL_STORAGE_KEYS.auditLogs, entries);
}

export function appendCommercialAudit(
  input: Omit<CommercialAuditEntry, "id" | "timestamp">
): CommercialAuditEntry {
  const entry: CommercialAuditEntry = {
    ...input,
    id: uid(),
    timestamp: new Date().toISOString(),
  };
  writeAudit([...readAudit(), entry]);
  return entry;
}

export function listCommercialAudit(orgId?: string, limit = 50): CommercialAuditEntry[] {
  const all = readAudit();
  const filtered = orgId ? all.filter((e) => e.orgId === orgId) : all;
  return filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
}
