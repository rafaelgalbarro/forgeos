/** ForgeOS RC6.5 — autonomous risk monitor. */

import type { DetectedRisk, DepartmentId } from "./types";

const RISKS: DetectedRisk[] = [
  {
    id: "risk-qa-1",
    departmentId: "qa",
    title: "Regresión potencial en rutas /live tras RC6",
    severity: "high",
    detectedAt: new Date(Date.now() - 6 * 3600_000).toISOString(),
    mitigation: "Ejecutar auditoría de rutas y smoke test nocturno",
  },
  {
    id: "risk-build-1",
    departmentId: "build",
    title: "Caché .next desincronizada en Windows",
    severity: "medium",
    detectedAt: new Date(Date.now() - 4 * 3600_000).toISOString(),
    mitigation: "reset:dev obligatorio tras build de producción",
  },
  {
    id: "risk-security-1",
    departmentId: "security",
    title: "Flags de ejecución real sin approval en dev",
    severity: "low",
    detectedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    mitigation: "Mantener ENABLE_REAL_AI=false por defecto",
  },
];

export function detectRisks(departmentId?: DepartmentId): DetectedRisk[] {
  const list = departmentId ? RISKS.filter((r) => r.departmentId === departmentId) : RISKS;
  return [...list].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function severityRank(s: DetectedRisk["severity"]): number {
  return { critical: 4, high: 3, medium: 2, low: 1 }[s];
}
