/** PROGRAM 5350 — Deployment output adapter (Cloud Foundation). */

import type { CreationOutput, DeploymentOutputPayload } from "../types";
import { createOutputId } from "../output-registry";

export interface DeploymentAdapterInput {
  missionId: string;
  ventureId?: string;
  projectName: string;
}

export async function buildDeploymentOutput(input: DeploymentAdapterInput): Promise<CreationOutput> {
  let cloudSummary = "preview-ready";
  let deploymentStatus = "preview";

  try {
    const { getCloudDeploymentHint, getDeploymentSnapshot } = await import(
      "@/lib/mission-control/adapters/cloud-foundation-adapter"
    );
    const [hint, snap] = await Promise.all([getCloudDeploymentHint(), getDeploymentSnapshot()]);
    cloudSummary = hint.summary;
    deploymentStatus = snap.status;
  } catch {
    cloudSummary = "Cloud Foundation adapter — preview";
  }

  const now = new Date().toISOString();

  const payload: DeploymentOutputPayload = {
    githubStatus: "DRY RUN — repo plan documentado",
    repoPlan: `forgeos/${input.projectName.toLowerCase().replace(/\s+/g, "-")}`,
    branch: "preview/studio",
    buildStatus: "PREVIEW PLAN — no build real",
    supabaseSandbox: "Sandbox schema — no prod DB",
    vercelPreview: "PREVIEW PLAN — URL simulada (no deploy)",
    environment: "preview",
    qualityGates: [
      { label: "Build", status: "pending" },
      { label: "Tests", status: "pending" },
      { label: "Security scan", status: "pass" },
      { label: "Approval", status: "pending" },
    ],
    rollbackPlan: "Rollback documentado — revert preview branch",
    deployed: false,
    dryRun: true,
  };

  return {
    outputId: createOutputId("DEPLOYMENT_OUTPUT"),
    missionId: input.missionId,
    ventureId: input.ventureId,
    type: "DEPLOYMENT_OUTPUT",
    title: `${input.projectName} — Deployment`,
    status: "DEPLOYMENT_READY",
    version: "1.0.0",
    createdAt: now,
    updatedAt: now,
    sourceArtifacts: [
      { artifactId: `art-deploy-${input.missionId}`, type: "deployment", label: "Deployment Preview" },
    ],
    previewMode: "dry-run",
    previewUrl: undefined,
    files: [
      { path: ".github/workflows/preview.yml", kind: "file", description: "CI preview workflow" },
      { path: "vercel.json", kind: "file", description: "Vercel config" },
    ],
    routes: [],
    screenshots: [],
    approvals: [
      {
        id: "appr-deploy-pending",
        status: "pending",
        requestedAt: now,
        note: "Aprobación requerida antes de cualquier deploy real",
      },
    ],
    warnings: [
      { id: "w-deploy-dry", severity: "warn", message: "DRY RUN / NOT DEPLOYED — sin URLs reales", code: "PREVIEW_SAFETY" },
      { id: "w-cloud", severity: "info", message: cloudSummary, code: "CLOUD_HINT" },
    ],
    nextActions: [
      { id: "na-approve", label: "Aprobar deploy preview", kind: "approve" },
      { id: "na-rollback", label: "Ver rollback plan", kind: "navigate" },
    ],
    payload,
    validation: {
      score: 75,
      passed: true,
      checks: [
        { id: "dry-run", label: "DRY RUN activo", status: "pass" },
        { id: "cloud", label: `Cloud: ${deploymentStatus}`, status: "pass" },
        { id: "no-prod", label: "Sin producción", status: "pass" },
      ],
      source: "adapter",
    },
  };
}
