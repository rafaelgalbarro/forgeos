/** PROGRAM 5380 — E2E NEXORA FIELD preview deployment validation. */

import { NEXORA_E2E_MISSION_ID } from "@/lib/creation-output/e2e-nexora-pipeline";
import { createEmptyCodeProject } from "@/lib/code-generation/code-project";
import { getOrCreateDemoSandboxBuild } from "@/lib/preview-runtime/sandbox-build";
import { getPreviewDeploymentFlagsSnapshot } from "./config";
import { createPreviewDeploymentDraft, executePreviewDeployment } from "./deployment-orchestrator";
import type { PreviewDeploymentRequest } from "./types";

export const NEXORA_PREVIEW_DEPLOY_MISSION_ID = NEXORA_E2E_MISSION_ID;

export interface NexoraPreviewDeployResult {
  missionId: string;
  website: PreviewDeploymentRequest;
  webapp: PreviewDeploymentRequest;
  mobile: { plan: string; note: string };
  flags: ReturnType<typeof getPreviewDeploymentFlagsSnapshot>;
  allDryRun: boolean;
  missingCredentials: string[];
  disclaimer: string;
}

export async function runNexoraPreviewDeploymentE2E(): Promise<NexoraPreviewDeployResult> {
  const flags = getPreviewDeploymentFlagsSnapshot();
  const missingCredentials: string[] = [];

  if (!flags.enableGithubPush) missingCredentials.push("GITHUB_TOKEN + ENABLE_PREVIEW_GITHUB_PUSH");
  if (!flags.enableVercelDeployment) missingCredentials.push("VERCEL_TOKEN + ENABLE_PREVIEW_VERCEL_DEPLOYMENT");
  if (!flags.enableSupabaseSetup) missingCredentials.push("SUPABASE_ACCESS_TOKEN + ENABLE_PREVIEW_SUPABASE_SETUP");
  if (!flags.enablePreviewDeployment) missingCredentials.push("ENABLE_PREVIEW_DEPLOYMENT");

  const missionId = NEXORA_PREVIEW_DEPLOY_MISSION_ID;
  const sandbox = getOrCreateDemoSandboxBuild(missionId, "nexora-website", "1.0.0");

  const websiteProject = createEmptyCodeProject({
    missionId,
    ventureId: "nexora-field",
    projectType: "website",
    name: "NEXORA FIELD Website",
    templateId: "nexora-website",
    framework: "next",
  });
  websiteProject.status = "READY_FOR_PREVIEW";
  websiteProject.validation = {
    result: "STATIC_VALIDATION_PASSED",
    passed: true,
    score: 90,
    checks: [{ id: "static", label: "Static", status: "pass" }],
    validatedAt: new Date().toISOString(),
  };

  const webappProject = createEmptyCodeProject({
    missionId,
    ventureId: "nexora-field",
    projectType: "web_application",
    name: "NEXORA FIELD Web App",
    templateId: "nexora-webapp",
    framework: "next",
  });
  webappProject.status = "READY_FOR_PREVIEW";
  webappProject.validation = websiteProject.validation;

  const websiteDraft = await createPreviewDeploymentDraft(
    {
      missionId,
      ventureId: "nexora-field",
      projectId: "nexora-website",
      projectVersion: "1.0.0",
      sandboxBuildId: sandbox.buildId,
      requestedBy: "e2e-harness",
    },
    websiteProject
  );

  const webappDraft = await createPreviewDeploymentDraft(
    {
      missionId,
      ventureId: "nexora-field",
      projectId: "nexora-webapp",
      projectVersion: "1.0.0",
      sandboxBuildId: sandbox.buildId,
      requestedBy: "e2e-harness",
    },
    webappProject
  );

  return {
    missionId,
    website: websiteDraft,
    webapp: webappDraft,
    mobile: {
      plan: "Expo preview plan only — not Vercel",
      note: "Mobile deploy uses Expo preview plan. Vercel deployment excluded for mobile targets.",
    },
    flags,
    allDryRun: flags.dryRunDefault,
    missingCredentials,
    disclaimer:
      "NEXORA FIELD E2E — full dry-run when flags/creds disabled. Real preview only with ENABLE_PREVIEW_* flags and provider tokens.",
  };
}

export async function runNexoraPreviewDeployExecute(): Promise<{
  website: Awaited<ReturnType<typeof executePreviewDeployment>>;
  webapp: Awaited<ReturnType<typeof executePreviewDeployment>>;
}> {
  const e2e = await runNexoraPreviewDeploymentE2E();
  const website = await executePreviewDeployment(
    {
      missionId: e2e.missionId,
      ventureId: "nexora-field",
      projectId: "nexora-website",
      projectVersion: "1.0.0",
      sandboxBuildId: e2e.website.sandboxBuildId,
      requestedBy: "e2e-harness",
      userConfirmed: true,
    },
    undefined,
    "e2e-harness"
  );
  const webapp = await executePreviewDeployment(
    {
      missionId: e2e.missionId,
      ventureId: "nexora-field",
      projectId: "nexora-webapp",
      projectVersion: "1.0.0",
      sandboxBuildId: e2e.webapp.sandboxBuildId,
      requestedBy: "e2e-harness",
      userConfirmed: true,
    },
    undefined,
    "e2e-harness"
  );
  return { website, webapp };
}
