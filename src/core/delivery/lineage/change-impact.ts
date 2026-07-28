/**
 * PROGRAM 6050 — Change Impact
 * When Artifact changes: identify affected Outputs/Codebases, don't invalidate unnecessarily,
 * create Change Plan, request approval when needed.
 */

import type {
  CanonicalArtifact,
  CanonicalOutput,
  CanonicalCodebase,
  ChangePlan,
} from "../types";
import { deliveryId } from "../ids";

export interface ChangeImpactInput {
  missionId: string;
  changedArtifact: CanonicalArtifact;
  previousChecksum?: string;
  outputs: CanonicalOutput[];
  codebases: CanonicalCodebase[];
}

export function analyzeArtifactChange(input: ChangeImpactInput): ChangePlan {
  const { changedArtifact, outputs, codebases, previousChecksum } = input;
  const contentUnchanged =
    previousChecksum !== undefined &&
    changedArtifact.checksum !== undefined &&
    previousChecksum === changedArtifact.checksum;

  const affectedOutputs = outputs.filter((o) =>
    o.sourceArtifactIds.includes(changedArtifact.artifactId)
  );
  const affectedCodebases = codebases.filter(
    (c) =>
      c.sourceArtifactIds.includes(changedArtifact.artifactId) ||
      (c.outputId !== undefined && affectedOutputs.some((o) => o.outputId === c.outputId))
  );

  const rationale: string[] = [];
  if (contentUnchanged) {
    rationale.push("Checksum unchanged — no invalidation required");
  } else {
    rationale.push(`Artifact ${changedArtifact.artifactId} content/metadata changed`);
    if (affectedOutputs.length === 0 && affectedCodebases.length === 0) {
      rationale.push("No downstream Outputs/Codebases reference this artifact");
    }
  }

  const invalidate = !contentUnchanged && (affectedOutputs.length > 0 || affectedCodebases.length > 0);
  const approvalRequired =
    invalidate &&
    (affectedCodebases.some((c) => c.status === "APPROVED" || c.status === "READY_FOR_PREVIEW") ||
      affectedOutputs.some((o) => o.status === "APPROVED" || o.status === "DEPLOYMENT_READY"));

  if (approvalRequired) {
    rationale.push("Approved downstream entities affected — approval required");
  }

  return {
    planId: deliveryId("chp"),
    missionId: input.missionId,
    changedArtifactId: changedArtifact.artifactId,
    affectedOutputIds: affectedOutputs.map((o) => o.outputId),
    affectedCodebaseIds: affectedCodebases.map((c) => c.codebaseId),
    invalidate,
    approvalRequired,
    rationale,
    createdAt: new Date().toISOString(),
    status: approvalRequired ? "pending_approval" : "draft",
  };
}
