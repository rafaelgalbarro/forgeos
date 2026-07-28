import type { VentureSimulatorOverrides } from "./types";

const STORAGE_KEY = "forgeos_simulator_overrides";

interface StoredOverrides {
  projectId: string;
  overrides: VentureSimulatorOverrides;
  updatedAt: string;
}

function readAll(): StoredOverrides[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredOverrides[]) : [];
  } catch {
    return [];
  }
}

function writeAll(records: StoredOverrides[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function saveSimulatorOverrides(projectId: string, overrides: VentureSimulatorOverrides): void {
  const records = readAll().filter((r) => r.projectId !== projectId);
  records.unshift({
    projectId,
    overrides,
    updatedAt: new Date().toISOString(),
  });
  writeAll(records);
}

export function getSimulatorOverrides(projectId: string): VentureSimulatorOverrides {
  return readAll().find((r) => r.projectId === projectId)?.overrides ?? {};
}

export function clearSimulatorOverrides(projectId: string): void {
  writeAll(readAll().filter((r) => r.projectId !== projectId));
}
