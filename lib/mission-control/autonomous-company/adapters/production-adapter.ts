/** Thin adapter — Production Readiness public API (Program 6500). */

import type { Incident } from "../types";

export async function fetchIncidentsSnapshot(): Promise<Incident[]> {
  const { listIncidents, seedDemoIncidents } = await import("@/lib/production-readiness");
  const incidents = listIncidents();
  const list = incidents.length > 0 ? incidents : seedDemoIncidents();
  return list.slice(0, 15).map((i) => ({
    id: i.id,
    title: i.title,
    severity: i.severity,
    status: i.status,
    createdAt: i.createdAt,
    description: i.description,
  }));
}

export async function fetchProductionHealthSnapshot(): Promise<{
  score: number;
  label: string;
  openIncidents: number;
}> {
  const { buildProductionHealthCenterSnapshot, listIncidents } = await import("@/lib/production-readiness");
  const snap = await buildProductionHealthCenterSnapshot();
  const scoreMap: Record<string, number> = { healthy: 90, degraded: 60, critical: 30, unknown: 50 };
  const open = listIncidents().filter((i) => i.status === "open" || i.status === "investigating").length;
  return {
    score: scoreMap[snap.overallStatus] ?? 50,
    label: snap.overallStatus ?? "unknown",
    openIncidents: open,
  };
}

export async function canDeployFromProduction(): Promise<boolean> {
  const { canDeploy } = await import("@/lib/production-readiness");
  return canDeploy();
}
