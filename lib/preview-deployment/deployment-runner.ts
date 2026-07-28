/** PROGRAM 5380 — Deployment execution runner. */

import type { CodeProject } from "@/lib/code-generation/types";
import {
  planOrConfigureSupabase,
  planOrCreateRepository,
  planOrDeployVercel,
} from "@/lib/cloud-foundation/preview-adapters";
import { getPreviewDeploymentPolicy } from "./config";
import { appendAuditEntry } from "./deployment-audit";
import { buildCodePushPlan, buildDeploymentPlan } from "./deployment-planner";
import { runHealthCheck, runSmokeTests, healthCheckPassed } from "./deployment-health";
import { updateDeploymentStatus } from "./deployment-request";
import type { PreviewDeploymentRequest, PreviewDeploymentResult } from "./types";

export async function runDeploymentSteps(
  request: PreviewDeploymentRequest,
  project: CodeProject,
  actor?: string
): Promise<PreviewDeploymentResult> {
  const policy = getPreviewDeploymentPolicy();
  let current = updateDeploymentStatus(request, "CREATING_REPOSITORY", "Starting deployment");
  current = appendAuditEntry(current, "deploy_start", current.status, "Deployment started", actor);

  const realExecution =
    policy.enablePreviewDeployment &&
    !current.dryRun &&
    (policy.enableGithubPush || policy.enableVercelDeployment || policy.enableSupabaseSetup);

  current = { ...current, realExecution };
  const plan = buildDeploymentPlan(project, current);

  current = {
    ...updateDeploymentStatus(current, "CREATING_REPOSITORY"),
    repository: plan.repository,
    supabase: plan.supabase,
    vercel: plan.vercel,
  };

  const ghResult = await planOrCreateRepository(plan.repository, project, realExecution);
  current = appendAuditEntry(
    current,
    "repository",
    "CREATING_REPOSITORY",
    ghResult.message,
    actor
  );
  current.repository = ghResult.plan;

  current = updateDeploymentStatus(current, "PUSHING_CODE", "Pushing code to repository");
  const pushResult = buildCodePushPlan(project, plan.repository.defaultBranch);
  pushResult.dryRun = ghResult.dryRun;
  pushResult.pushed = ghResult.created;
  current = { ...current, codePush: pushResult };
  current = appendAuditEntry(current, "code_push", "PUSHING_CODE", `${pushResult.filesRegistered} files registered`, actor);

  current = updateDeploymentStatus(current, "CONFIGURING_ENVIRONMENT", "Configuring Supabase preview");
  const sbResult = await planOrConfigureSupabase(plan.supabase, realExecution);
  current.supabase = sbResult.plan;
  current = appendAuditEntry(current, "supabase", "CONFIGURING_ENVIRONMENT", sbResult.message, actor);

  current = updateDeploymentStatus(current, "DEPLOYING", "Deploying Vercel preview");
  const vcResult = await planOrDeployVercel(
    { ...plan.vercel, previewUrl: current.vercel?.previewUrl },
    realExecution
  );
  current.vercel = vcResult.plan;
  current = appendAuditEntry(current, "vercel", "DEPLOYING", vcResult.message, actor);

  current = updateDeploymentStatus(current, "VERIFYING", "Running health check");
  const health = await runHealthCheck(vcResult.plan, vcResult.dryRun);
  current.healthCheck = health;
  const smokeTests = await runSmokeTests(vcResult.previewUrl, vcResult.dryRun);
  current.smokeTests = smokeTests;

  const healthOk = healthCheckPassed(health);
  if (!healthOk) {
    current = updateDeploymentStatus(current, "FAILED", "Health check failed");
    current.errors = [...current.errors, "Health check failed"];
    current = appendAuditEntry(current, "health_failed", "FAILED", "Health check failed", actor);
    return { request: current, success: false, blockedReason: "Health check failed" };
  }

  if (vcResult.dryRun) {
    current = {
      ...updateDeploymentStatus(current, "READY_WITH_PLAN", "DRY RUN — deployment plan ready"),
      dryRun: true,
      previewUrl: undefined,
    };
    current.warnings = [
      ...current.warnings,
      "DRY RUN / PREVIEW PLAN / NOT DEPLOYED — no real URL",
    ];
    current = appendAuditEntry(current, "ready_plan", "READY_WITH_PLAN", "Dry-run plan complete", actor);
  } else {
    current = {
      ...updateDeploymentStatus(current, "READY", "Preview deployment ready"),
      dryRun: false,
      previewUrl: vcResult.previewUrl,
    };
    current = appendAuditEntry(
      current,
      "ready",
      "READY",
      `Preview URL: ${vcResult.previewUrl}`,
      actor
    );
  }

  return { request: current, success: true };
}

export async function rollbackDeployment(
  request: PreviewDeploymentRequest,
  actor?: string
): Promise<PreviewDeploymentRequest> {
  let current = updateDeploymentStatus(request, "CANCELLED", "Rollback initiated");
  current = appendAuditEntry(current, "rollback_start", "CANCELLED", "Rollback started", actor);

  for (const step of request.rollbackPlan.steps) {
    current.logs = [...current.logs, `[${new Date().toISOString()}] Rollback: ${step}`];
  }

  current = updateDeploymentStatus(current, "ROLLED_BACK", "Deployment rolled back");
  current = appendAuditEntry(current, "rollback_complete", "ROLLED_BACK", "Rollback complete", actor);
  return current;
}
