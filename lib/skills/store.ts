/** ForgeOS Skills Framework — store & history (RC4). */

import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import type { SkillAuditLog, SkillMemoryRecord, SkillTelemetryRecord } from "./types";

function readAuditLogs(): SkillAuditLog[] {
  return readStorage<SkillAuditLog[]>(STORAGE_KEYS.skillAuditLogs, []);
}

function writeAuditLogs(logs: SkillAuditLog[]): void {
  writeStorage(STORAGE_KEYS.skillAuditLogs, logs.slice(0, 1000));
}

function readTelemetry(): SkillTelemetryRecord[] {
  return readStorage<SkillTelemetryRecord[]>(STORAGE_KEYS.skillTelemetry, []);
}

function writeTelemetry(records: SkillTelemetryRecord[]): void {
  writeStorage(STORAGE_KEYS.skillTelemetry, records.slice(0, 1000));
}

function readMemory(): SkillMemoryRecord[] {
  return readStorage<SkillMemoryRecord[]>(STORAGE_KEYS.skillMemory, []);
}

function writeMemory(records: SkillMemoryRecord[]): void {
  writeStorage(STORAGE_KEYS.skillMemory, records.slice(0, 500));
}

export function appendAuditLog(log: Omit<SkillAuditLog, "id" | "timestamp">): SkillAuditLog {
  const entry: SkillAuditLog = {
    ...log,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const logs = readAuditLogs();
  logs.unshift(entry);
  writeAuditLogs(logs);
  return entry;
}

export function appendTelemetry(record: Omit<SkillTelemetryRecord, "id" | "timestamp">): SkillTelemetryRecord {
  const entry: SkillTelemetryRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const records = readTelemetry();
  records.unshift(entry);
  writeTelemetry(records);
  return entry;
}

export function appendSkillMemory(record: Omit<SkillMemoryRecord, "id" | "timestamp">): SkillMemoryRecord {
  const entry: SkillMemoryRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const records = readMemory();
  records.unshift(entry);
  writeMemory(records);
  return entry;
}

export function getSkillAuditLogs(ventureId?: string): SkillAuditLog[] {
  const logs = readAuditLogs();
  return ventureId ? logs.filter((l) => l.ventureId === ventureId) : logs;
}

export function getSkillTelemetry(): SkillTelemetryRecord[] {
  return readTelemetry();
}

export function getSkillMemory(ventureId?: string): SkillMemoryRecord[] {
  const records = readMemory();
  return ventureId ? records.filter((r) => r.ventureId === ventureId) : records;
}

export function getSkillHistory(ventureId?: string): SkillMemoryRecord[] {
  return getSkillMemory(ventureId);
}
