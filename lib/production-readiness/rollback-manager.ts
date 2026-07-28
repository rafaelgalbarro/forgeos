/** Program 6500 — Rollback plan stub */

import { getLatestRelease, listReleases } from "./release-manager";
import type { RollbackPlan } from "./types";

export function getRollbackPlan(releaseId?: string): RollbackPlan | null {
  const release = releaseId
    ? listReleases().find((r) => r.id === releaseId)
    : getLatestRelease();
  if (!release) return null;

  return {
    id: `rollback-${release.id}`,
    releaseId: release.id,
    steps: [
      "Verificar gates de despliegue",
      "Notificar stakeholders",
      `Revertir a versión anterior de ${release.version}`,
      "Ejecutar health checks post-rollback",
      "Registrar incidente si aplica",
    ],
    estimatedMinutes: 15,
    ready: true,
  };
}

export function listRollbackPlans(): RollbackPlan[] {
  return listReleases()
    .slice(0, 3)
    .map((r) => getRollbackPlan(r.id))
    .filter((p): p is RollbackPlan => p !== null);
}
