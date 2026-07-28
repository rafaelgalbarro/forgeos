import type { ReleasePackage, ReleaseValidationIssue, ReleaseValidationResult } from "./types";
import { allBlockingGatesPassed } from "./quality-gates";
import { formatSemanticVersion } from "./release-versioning";

function issue(
  code: string,
  message: string,
  severity: ReleaseValidationIssue["severity"] = "warning",
  field?: string,
): ReleaseValidationIssue {
  return { code, message, severity, field };
}

export function validateReleasePackage(pkg: ReleasePackage): ReleaseValidationResult {
  const issues: ReleaseValidationIssue[] = [];

  if (!pkg.releaseId) {
    issues.push(issue("RELEASE_ID_MISSING", "Release ID is required", "error", "releaseId"));
  }

  if (!pkg.ventureId) {
    issues.push(issue("VENTURE_ID_MISSING", "Venture ID is required", "error", "ventureId"));
  }

  const versionStr = formatSemanticVersion(pkg.version);
  if (!versionStr) {
    issues.push(issue("VERSION_INVALID", "Semantic version is invalid", "error", "version"));
  }

  if (!pkg.artifacts.frontendBlueprint) {
    issues.push(issue("ARTIFACT_FRONTEND_MISSING", "Frontend blueprint is required", "error"));
  }

  if (!pkg.artifacts.backendBlueprint) {
    issues.push(issue("ARTIFACT_BACKEND_MISSING", "Backend blueprint is required", "error"));
  }

  if (!pkg.artifacts.databaseBlueprint) {
    issues.push(issue("ARTIFACT_DATABASE_MISSING", "Database blueprint is required", "error"));
  }

  if (!pkg.artifacts.qaPlan) {
    issues.push(issue("ARTIFACT_QA_MISSING", "QA plan is required", "error"));
  }

  if (!pkg.artifacts.infrastructureSpec) {
    issues.push(issue("ARTIFACT_INFRA_MISSING", "Infrastructure spec is required", "error"));
  }

  if (!allBlockingGatesPassed(pkg.qualityGates)) {
    issues.push(
      issue(
        "QUALITY_GATES_BLOCKED",
        "One or more blocking quality gates failed",
        "error",
        "qualityGates",
      ),
    );
  }

  if (pkg.deploymentChecklist.length === 0) {
    issues.push(issue("CHECKLIST_EMPTY", "Deployment checklist is empty", "warning"));
  }

  if (!pkg.rollbackPlan.steps.length) {
    issues.push(issue("ROLLBACK_EMPTY", "Rollback plan has no steps", "warning"));
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const score = Math.max(0, 100 - errors * 20 - warnings * 5);

  return {
    valid: errors === 0,
    score,
    issues,
  };
}
