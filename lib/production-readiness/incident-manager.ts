/** Program 6500 — Incidents CRUD stub (localStorage) */

import { readStorage, writeStorage } from "@/lib/beta-platform/storage";
import { PRODUCTION_STORAGE_KEYS } from "./config";
import type { AlertSeverity, IncidentStatus, ProductionIncident } from "./types";

function generateId(): string {
  return `inc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listIncidents(): ProductionIncident[] {
  return readStorage<ProductionIncident[]>(PRODUCTION_STORAGE_KEYS.incidents, []);
}

export function getIncident(id: string): ProductionIncident | null {
  return listIncidents().find((i) => i.id === id) ?? null;
}

export function createIncident(input: {
  title: string;
  description: string;
  severity: AlertSeverity;
  tags?: string[];
}): ProductionIncident {
  const now = new Date().toISOString();
  const incident: ProductionIncident = {
    id: generateId(),
    title: input.title,
    description: input.description,
    severity: input.severity,
    status: "open",
    createdAt: now,
    updatedAt: now,
    tags: input.tags ?? [],
  };
  const all = listIncidents();
  all.unshift(incident);
  writeStorage(PRODUCTION_STORAGE_KEYS.incidents, all);
  return incident;
}

export function updateIncidentStatus(id: string, status: IncidentStatus): ProductionIncident | null {
  const all = listIncidents();
  const idx = all.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  all[idx] = { ...all[idx]!, status, updatedAt: new Date().toISOString() };
  writeStorage(PRODUCTION_STORAGE_KEYS.incidents, all);
  return all[idx]!;
}

export function deleteIncident(id: string): boolean {
  const all = listIncidents().filter((i) => i.id !== id);
  if (all.length === listIncidents().length) return false;
  writeStorage(PRODUCTION_STORAGE_KEYS.incidents, all);
  return true;
}

export function seedDemoIncidents(): ProductionIncident[] {
  if (listIncidents().length > 0) return listIncidents();
  return [
    createIncident({
      title: "Latencia elevada en proveedor AI",
      description: "Stub — incidente de demostración para el panel de producción.",
      severity: "warning",
      tags: ["ai", "latency"],
    }),
  ];
}
