/** ForgeOS Capability Layer — store (RC4.9). */

import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import type { CapabilityAuditLog } from "./types";

export interface CapabilityStoreEntry {
  id: string;
  capabilityId: string;
  ventureId: string;
  lastRequestAt: string;
  requestCount: number;
  lastOutcome: CapabilityAuditLog["outcome"];
}

interface CapabilityStoreData {
  entries: CapabilityStoreEntry[];
  audits: CapabilityAuditLog[];
}

const EMPTY_STORE: CapabilityStoreData = { entries: [], audits: [] };

function readStoreData(): CapabilityStoreData {
  return readStorage<CapabilityStoreData>(STORAGE_KEYS.capabilityStore, EMPTY_STORE);
}

function writeStoreData(data: CapabilityStoreData): void {
  writeStorage(STORAGE_KEYS.capabilityStore, {
    entries: data.entries.slice(0, 500),
    audits: data.audits.slice(0, 1000),
  });
}

export function upsertCapabilityStoreEntry(params: {
  capabilityId: string;
  ventureId: string;
  outcome: CapabilityAuditLog["outcome"];
}): CapabilityStoreEntry {
  const data = readStoreData();
  const idx = data.entries.findIndex(
    (e) => e.capabilityId === params.capabilityId && e.ventureId === params.ventureId
  );

  if (idx >= 0) {
    const updated: CapabilityStoreEntry = {
      ...data.entries[idx]!,
      lastRequestAt: new Date().toISOString(),
      requestCount: data.entries[idx]!.requestCount + 1,
      lastOutcome: params.outcome,
    };
    data.entries[idx] = updated;
    writeStoreData(data);
    return updated;
  }

  const entry: CapabilityStoreEntry = {
    id: crypto.randomUUID(),
    capabilityId: params.capabilityId,
    ventureId: params.ventureId,
    lastRequestAt: new Date().toISOString(),
    requestCount: 1,
    lastOutcome: params.outcome,
  };
  data.entries.unshift(entry);
  writeStoreData(data);
  return entry;
}

export function getCapabilityStore(ventureId?: string): CapabilityStoreEntry[] {
  const { entries } = readStoreData();
  return ventureId ? entries.filter((e) => e.ventureId === ventureId) : entries;
}

export function appendCapabilityAudit(
  log: Omit<CapabilityAuditLog, "id" | "timestamp">
): CapabilityAuditLog {
  const entry: CapabilityAuditLog = {
    ...log,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const data = readStoreData();
  data.audits.unshift(entry);
  writeStoreData(data);
  upsertCapabilityStoreEntry({
    capabilityId: log.capabilityId,
    ventureId: log.ventureId,
    outcome: log.outcome,
  });
  return entry;
}

export function getCapabilityAuditLogs(ventureId?: string): CapabilityAuditLog[] {
  const { audits } = readStoreData();
  return ventureId ? audits.filter((l) => l.ventureId === ventureId) : audits;
}
