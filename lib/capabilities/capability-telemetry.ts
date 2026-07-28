/** ForgeOS Capability Layer — telemetry (RC4.9). */

import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import type { CapabilityTelemetryRecord } from "./types";

function readTelemetry(): CapabilityTelemetryRecord[] {
  return readStorage<CapabilityTelemetryRecord[]>(STORAGE_KEYS.capabilityTelemetry, []);
}

function writeTelemetry(records: CapabilityTelemetryRecord[]): void {
  writeStorage(STORAGE_KEYS.capabilityTelemetry, records.slice(0, 1000));
}

export function appendCapabilityTelemetry(
  record: Omit<CapabilityTelemetryRecord, "id" | "timestamp">
): CapabilityTelemetryRecord {
  const entry: CapabilityTelemetryRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const records = readTelemetry();
  records.unshift(entry);
  writeTelemetry(records);
  return entry;
}

export function getCapabilityTelemetry(): CapabilityTelemetryRecord[] {
  return readTelemetry();
}
