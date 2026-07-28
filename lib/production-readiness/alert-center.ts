/** Program 6500 — Alerts registry (localStorage) */

import { readStorage, writeStorage } from "@/lib/beta-platform/storage";
import { PRODUCTION_STORAGE_KEYS } from "./config";
import type { AlertSeverity, ProductionAlert } from "./types";

function generateId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listAlerts(): ProductionAlert[] {
  return readStorage<ProductionAlert[]>(PRODUCTION_STORAGE_KEYS.alerts, []);
}

export function getActiveAlerts(): ProductionAlert[] {
  return listAlerts().filter((a) => !a.acknowledged);
}

export function pushAlert(input: {
  title: string;
  message: string;
  severity: AlertSeverity;
  source: string;
}): ProductionAlert {
  const alert: ProductionAlert = {
    id: generateId(),
    ...input,
    createdAt: new Date().toISOString(),
    acknowledged: false,
  };
  const all = listAlerts();
  all.unshift(alert);
  writeStorage(PRODUCTION_STORAGE_KEYS.alerts, all.slice(0, 200));
  return alert;
}

export function acknowledgeAlert(id: string): ProductionAlert | null {
  const all = listAlerts();
  const idx = all.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  all[idx] = {
    ...all[idx]!,
    acknowledged: true,
    acknowledgedAt: new Date().toISOString(),
  };
  writeStorage(PRODUCTION_STORAGE_KEYS.alerts, all);
  return all[idx]!;
}

export function clearAcknowledgedAlerts(): void {
  writeStorage(
    PRODUCTION_STORAGE_KEYS.alerts,
    listAlerts().filter((a) => !a.acknowledged)
  );
}

export function seedDemoAlerts(): ProductionAlert[] {
  const existing = listAlerts();
  if (existing.length > 0) return existing;

  return [
    pushAlert({
      title: "Monitoreo activo",
      message: "Program 6500 — centro de salud de producción inicializado.",
      severity: "info",
      source: "production-health-center",
    }),
    pushAlert({
      title: "Modo dry-run",
      message: "Procedimientos de recuperación y backup en modo simulación.",
      severity: "warning",
      source: "recovery-center",
    }),
  ];
}
