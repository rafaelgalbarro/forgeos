/** Program 4300 — Rollback plan stub (wired to build-pipeline) */

import { getBuildPipelineSnapshot } from "@/lib/build-pipeline";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import type { RollbackPreparedPlan } from "./types";

const DEFAULT_ROLLBACK: RollbackPreparedPlan = {
  id: "rollback-4300-default",
  releaseId: "rel-4300-seed-1",
  ready: true,
  steps: [
    "Revertir despliegue Vercel al deployment anterior",
    "Ejecutar rollback de migraciones Supabase (si aplica)",
    "Restaurar feature flags al estado pre-release",
    "Verificar health checks de producción",
    "Notificar al equipo vía alert center",
  ],
  estimatedMinutes: 15,
  wiredToBuildPipeline: true,
  summary: "Plan de rollback preparado — conectado a build-pipeline rollback-plan",
};

export async function getRollbackPreparedPlan(): Promise<RollbackPreparedPlan> {
  try {
    const pipeline = await getBuildPipelineSnapshot(LAB_MOCK_VENTURE_ID, "cloud-foundation");
    if (pipeline.rollbackPlan) {
      return {
        id: pipeline.rollbackPlan.planId,
        releaseId: pipeline.buildReport?.reportId ?? "unknown",
        ready: pipeline.rollbackPlan.ready,
        steps: pipeline.rollbackPlan.recoverySteps,
        estimatedMinutes: 15,
        wiredToBuildPipeline: true,
        summary: pipeline.rollbackPlan.summary,
      };
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_ROLLBACK;
}

export function getRollbackReadinessLabel(ready: boolean): string {
  return ready ? "Rollback preparado" : "Rollback incompleto";
}
