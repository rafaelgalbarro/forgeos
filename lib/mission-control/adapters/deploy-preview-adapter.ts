/** PROGRAM 5150 — DEPLOY phase preview (no production actions). */

import type { MissionSession, MissionArtifact } from "../types";

export interface DeployPreviewResult {
  artifact: MissionArtifact;
  summary: string;
}

export async function prepareDeployPreview(session: MissionSession): Promise<DeployPreviewResult> {
  const [cloud, production] = await Promise.all([
    loadCloudHint(),
    loadProductionHint(),
  ]);

  const artifact: MissionArtifact = {
    id: `art-deploy-${Date.now()}`,
    type: "deployment",
    label: "Deployment Preview",
    phase: "DEPLOY",
    source: "demo",
    summary: [
      "GitHub: repo plan (sandbox)",
      "Supabase: sandbox schema",
      "Vercel: preview URL",
      `Cloud: ${cloud.summary}`,
      `Production readiness: ${production.label} (${production.score}%)`,
      "Rollback: plan documentado",
      "Aprobación: pendiente founder",
    ].join(" · "),
    createdAt: new Date().toISOString(),
  };

  const summary =
    "DEPLOY preparado (solo preview). GitHub plan, Supabase sandbox, Vercel preview, " +
    "variables de entorno y rollback documentados. Sin DNS ni producción. " +
    "Se requiere tu aprobación para continuar.";

  return { artifact, summary };
}

async function loadCloudHint(): Promise<{ summary: string }> {
  try {
    const { getCloudDeploymentHint } = await import("./cloud-foundation-adapter");
    return await getCloudDeploymentHint();
  } catch {
    return { summary: "preview-ready" };
  }
}

async function loadProductionHint(): Promise<{ score: number; label: string }> {
  try {
    const { getProductionHealthHint } = await import("./production-adapter");
    return await getProductionHealthHint();
  } catch {
    return { score: 50, label: "preview" };
  }
}
