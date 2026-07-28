import { buildBuildContextFromVenture } from "@/lib/build-platform/build-context";
import { createBuildDnaFromContext } from "@/lib/build-platform/build-dna";
import { createApprovalWorkflow } from "./approval-workflow";
import { collectReleaseArtifacts } from "./release-artifacts";
import { buildDeploymentChecklist } from "./release-checklist";
import { buildReleaseNotes } from "./release-notes";
import { buildReleaseTimeline } from "./release-timeline";
import { evaluateQualityGates } from "./quality-gates";
import { buildRollbackPlan } from "./rollback-plan";
import type { BuildReleasePackageInput, ReleasePackage } from "./types";
import { createInitialVersion } from "./release-versioning";

function createReleaseId(ventureId: string): string {
  const stamp = Date.now().toString(36);
  return `rel-${ventureId.slice(0, 8)}-${stamp}`;
}

export function buildReleasePackage(input: BuildReleasePackageInput): ReleasePackage {
  const { venture } = input;
  const createdAt = new Date().toISOString();

  const context = buildBuildContextFromVenture(venture, {
    persist: false,
    recordHistory: false,
  });
  const dna = createBuildDnaFromContext(context);
  const artifacts = collectReleaseArtifacts(context, dna);
  const qualityGates = evaluateQualityGates(context, dna, artifacts);
  const approvals = createApprovalWorkflow(qualityGates, createdAt);
  const rollbackPlan = buildRollbackPlan(venture.name, artifacts);
  const releaseNotes = buildReleaseNotes(context, artifacts);
  const deploymentChecklist = buildDeploymentChecklist(artifacts);
  const timeline = buildReleaseTimeline(venture.name, qualityGates, approvals, createdAt);

  return {
    releaseId: createReleaseId(venture.id),
    ventureId: venture.id,
    version: createInitialVersion("rc.1"),
    status: approvals.status,
    createdAt,
    artifacts,
    qualityGates,
    approvals,
    rollbackPlan,
    releaseNotes,
    deploymentChecklist,
    timeline,
  };
}
