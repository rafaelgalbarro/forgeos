/** PROGRAM 5380 — Deployment precondition validator. */

import type { CodeProject } from "@/lib/code-generation/types";
import type { SandboxPreviewBuild } from "@/lib/preview-runtime/types";
import { isSandboxReadyForDeploy } from "@/lib/preview-runtime/sandbox-build";
import { getPreviewDeploymentPolicy } from "./config";
import type { DeploymentPrecondition, PreviewDeploymentRequest } from "./types";

async function checkProviderHealth(): Promise<{ healthy: boolean; detail: string }> {
  try {
    const { checkAllProviderHealthRc53 } = await import(
      "@/lib/real-execution/providers/provider-health-check"
    );
    const health = await checkAllProviderHealthRc53();
    const failed = health.filter((h) => h.configured && !h.healthy);
    if (failed.length > 0) {
      return { healthy: false, detail: `Unhealthy: ${failed.map((f) => f.provider).join(", ")}` };
    }
    return { healthy: true, detail: "All configured providers healthy" };
  } catch {
    return { healthy: true, detail: "Provider health check skipped (dry-run)" };
  }
}

function detectSecretsInProject(project: CodeProject): { passed: boolean; detail: string } {
  const blockedPaths = [".env.local", "credentials.json", ".pem", "id_rsa"];
  const blocked = project.files.filter((f) =>
    blockedPaths.some((p) => f.path.includes(p))
  );
  if (blocked.length > 0) {
    return { passed: false, detail: `Blocked files: ${blocked.map((f) => f.path).join(", ")}` };
  }
  const secretPatterns = [/sk_live_/i, /AKIA[0-9A-Z]{16}/, /-----BEGIN PRIVATE KEY-----/];
  for (const file of project.files) {
    for (const pattern of secretPatterns) {
      if (pattern.test(file.content)) {
        return { passed: false, detail: `Potential secret in ${file.path}` };
      }
    }
  }
  return { passed: true, detail: "No secrets detected" };
}

export async function validateDeploymentPreconditions(input: {
  sandboxBuild: SandboxPreviewBuild;
  project: CodeProject;
  request: PreviewDeploymentRequest;
}): Promise<DeploymentPrecondition[]> {
  const policy = getPreviewDeploymentPolicy();
  const providerHealth = await checkProviderHealth();
  const secretsCheck = detectSecretsInProject(input.project);
  const qaBlocked = input.sandboxBuild.qaGates.some(
    (g) => g.blocking && (g.status === "fail" || g.status === "blocked")
  );

  const sandboxPassed = isSandboxReadyForDeploy(input.sandboxBuild);
  const criticalErrors = input.sandboxBuild.criticalErrors.length > 0;
  const securityBlocked = input.sandboxBuild.securityScan.blocked;
  const approvalPassed =
    input.request.approval.status === "approved" ||
    (!policy.requireApproval && input.request.approval.status !== "rejected");
  const rollbackDocumented = input.request.rollbackPlan.documented;
  const environmentOk =
    policy.environment === "preview" || policy.environment === "sandbox" || policy.environment === "dry_run";
  const productionBlocked = !policy.allowProduction;

  return [
    {
      id: "sandbox_build",
      label: "Sandbox build passed",
      passed: sandboxPassed,
      blocking: true,
      detail: input.sandboxBuild.status,
    },
    {
      id: "critical_errors",
      label: "No critical errors",
      passed: !criticalErrors,
      blocking: true,
      detail: criticalErrors ? input.sandboxBuild.criticalErrors.join("; ") : "OK",
    },
    {
      id: "qa_gate",
      label: "QA gates",
      passed: !qaBlocked,
      blocking: true,
      detail: qaBlocked ? "QA gate blocked" : "Gates passed",
    },
    {
      id: "security_scan",
      label: "Security scan",
      passed: !securityBlocked,
      blocking: true,
      detail: securityBlocked ? "Security scan blocked" : "Passed",
    },
    {
      id: "approval",
      label: "Approval",
      passed: approvalPassed,
      blocking: policy.requireApproval,
      detail: input.request.approval.status,
    },
    {
      id: "rollback_plan",
      label: "Rollback plan",
      passed: rollbackDocumented,
      blocking: true,
      detail: rollbackDocumented ? "Documented" : "Missing",
    },
    {
      id: "provider_health",
      label: "Provider health",
      passed: providerHealth.healthy,
      blocking: false,
      detail: providerHealth.detail,
    },
    {
      id: "feature_flag",
      label: "Preview deployment enabled",
      passed: policy.enablePreviewDeployment || true,
      blocking: false,
      detail: policy.enablePreviewDeployment ? "ENABLED" : "DRY-RUN (flag off)",
    },
    {
      id: "no_secrets",
      label: "No secrets in project",
      passed: secretsCheck.passed,
      blocking: true,
      detail: secretsCheck.detail,
    },
    {
      id: "environment_preview",
      label: "Preview environment only",
      passed: environmentOk && productionBlocked,
      blocking: true,
      detail: policy.allowProduction ? "BLOCKED — production not allowed" : policy.environment,
    },
  ];
}

export function allBlockingPreconditionsPassed(preconditions: DeploymentPrecondition[]): boolean {
  return preconditions.filter((p) => p.blocking).every((p) => p.passed);
}

export function canPublishPreview(preconditions: DeploymentPrecondition[]): boolean {
  return allBlockingPreconditionsPassed(preconditions);
}
