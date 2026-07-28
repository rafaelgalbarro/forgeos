/** Program 4300 — Deployment status aggregator (reads build-pipeline) */

import {
  getBuildPipelinePolicy,
  getBuildPipelineSnapshot,
} from "@/lib/build-pipeline";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import type {
  CloudHealthStatus,
  DeploymentProviderStatus,
  DeploymentSnapshot,
} from "./types";

function mapProviderHealth(healthy: boolean): CloudHealthStatus {
  return healthy ? "healthy" : "unknown";
}

export async function buildDeploymentSnapshot(): Promise<DeploymentSnapshot> {
  const policy = getBuildPipelinePolicy();

  let pipeline = null;
  try {
    pipeline = await getBuildPipelineSnapshot(LAB_MOCK_VENTURE_ID, "cloud-foundation");
  } catch {
    pipeline = null;
  }

  const providers: DeploymentProviderStatus[] = (pipeline?.connectionHealth ?? []).map((h) => ({
    provider: h.provider as DeploymentProviderStatus["provider"],
    status: mapProviderHealth(h.healthy),
    message: h.healthy ? "Conexión configurada" : (h.message ?? "Pendiente de configuración"),
    lastCheckedAt: new Date().toISOString(),
  }));

  if (providers.length === 0) {
    for (const p of ["github", "vercel", "cloudflare", "supabase"] as const) {
      providers.push({
        provider: p,
        status: "unknown",
        message: "Sin datos de pipeline — modo preparación",
        lastCheckedAt: new Date().toISOString(),
      });
    }
  }

  const stagesCompleted = pipeline?.stages.filter((s) => s.status === "completed").length ?? 0;
  const stagesTotal = pipeline?.stages.length ?? 0;

  let status: DeploymentSnapshot["status"] = "pending";
  if (pipeline?.buildReport?.success) status = "ready";
  if (pipeline?.deployPreviewPlan) status = "deployed";
  if (pipeline?.stages.some((s) => s.status === "failed")) status = "failed";

  return {
    pipelineId: pipeline?.pipelineId,
    mode: pipeline?.mode ?? policy.defaultMode,
    status,
    previewUrl: pipeline?.deployPreviewPlan?.previewUrl ?? pipeline?.buildReport?.previewUrl,
    repoUrl: pipeline?.buildReport?.repoUrl,
    stagesCompleted,
    stagesTotal,
    providers,
    rollbackReady: pipeline?.rollbackPlan?.ready ?? false,
    productionBlocked: policy.productionBlocked,
  };
}
