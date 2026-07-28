/**
 * PROGRAM 6050 — Deterministic E2E fixture: full pipeline traversal.
 * dry-run deployment is never declared as real.
 */

import { createArtifact } from "../artifact/registry";
import { createCanonicalOutput } from "../output/registry";
import { createCanonicalCodebase } from "../codebase/registry";
import { createDeliveryKernel, type DeliveryKernel } from "../kernel";
import { answerLineageQuestions, findPath } from "../lineage/version-graph";
import { DELIVERY_MODEL_VERSION } from "../types";

export const DELIVERY_E2E_MISSION_ID = "mission-6050-delivery-e2e";

export interface DeliveryE2EResult {
  ok: boolean;
  version: typeof DELIVERY_MODEL_VERSION;
  missionId: string;
  lineageAnswers: ReturnType<typeof answerLineageQuestions>;
  pathArtifactToDeployment?: string[];
  dryRunOutcome: string;
  realDeployClaimedOnDryRun: boolean;
  snapshot: ReturnType<DeliveryKernel["snapshot"]>;
  errors: string[];
}

export function runDeliveryPipelineE2E(kernel?: DeliveryKernel): DeliveryE2EResult {
  const k = kernel ?? createDeliveryKernel();
  const errors: string[] = [];
  const missionId = DELIVERY_E2E_MISSION_ID;

  const artifact = createArtifact({
    artifactId: "art-6050-knowledge-brief",
    missionId,
    ventureId: "ven-nexora-field",
    kind: "KNOWLEDGE",
    title: "Nexora Field Knowledge Brief",
    status: "READY",
    version: "1.0.0",
    checksum: "chk-brief-v1",
    sourceKnowledgeIds: ["know-6050-1"],
  });
  k.registerArtifact(artifact);

  const productSpec = createArtifact({
    artifactId: "art-6050-product-spec",
    missionId,
    ventureId: "ven-nexora-field",
    kind: "PRODUCT_SPEC",
    title: "Nexora Field Product Spec",
    status: "READY",
    version: "1.0.0",
    checksum: "chk-spec-v1",
    dependencyIds: [artifact.artifactId],
  });
  k.artifacts.save(productSpec);

  const output = createCanonicalOutput({
    outputId: "out-6050-website",
    missionId,
    ventureId: "ven-nexora-field",
    kind: "WEBSITE_OUTPUT",
    title: "Nexora Field Website",
    status: "APPROVED",
    version: "1.0.0",
    sourceArtifactIds: [artifact.artifactId, productSpec.artifactId],
    previewMode: "sandbox",
  });
  k.registerOutput(output);

  const codebase = createCanonicalCodebase({
    codebaseId: "cb-6050-website",
    missionId,
    ventureId: "ven-nexora-field",
    outputId: output.outputId,
    name: "nexora-field-web",
    slug: "nexora-field-web",
    version: "1.0.0",
    status: "READY_FOR_PREVIEW",
    framework: "nextjs",
    language: "typescript",
    packageManager: "npm",
    templateId: "website-nextjs",
    files: [
      {
        path: "app/page.tsx",
        language: "typescriptreact",
        content: "export default function Page(){return null}",
        purpose: "Home",
        checksum: "chk-page",
        sourceArtifactIds: [productSpec.artifactId],
      },
    ],
    directories: [{ path: "app" }],
    dependencies: [{ name: "next", version: "15.0.0" }],
    scripts: [{ name: "build", command: "next build" }],
    environmentVariables: [
      {
        key: "NEXT_PUBLIC_APP_URL",
        description: "App URL",
        example: "http://localhost:3000",
        required: false,
      },
    ],
    sourceArtifactIds: [productSpec.artifactId],
  });
  k.registerCodebase(codebase);

  const failedBuild = k.compileCodebase({
    missionId,
    codebaseId: codebase.codebaseId,
    succeed: false,
  });
  try {
    k.builds.complete(failedBuild.buildId, "SUCCESS");
    errors.push("Build immutability violated — failed build overwritten");
  } catch {
    /* expected */
  }

  const successBuild = k.compileCodebase({
    missionId,
    codebaseId: codebase.codebaseId,
    succeed: true,
  });

  const preview = k.createPreviewForBuild({
    missionId,
    buildId: successBuild.buildId,
    type: "LOCAL_SANDBOX",
  });

  const release = k.publishRelease({
    missionId,
    version: "1.0.0",
    outputIds: [output.outputId],
    codebaseVersions: [{ codebaseId: codebase.codebaseId, version: codebase.version }],
    buildIds: [successBuild.buildId],
    changelog: ["PROGRAM 6050 E2E fixture release"],
    approvedBy: "e2e-governor",
  });

  try {
    k.releases.saveDraft({ ...release, changelog: ["mutated"] });
    errors.push("Release immutability violated");
  } catch {
    /* expected */
  }

  const dry = k.planDeployment({
    missionId,
    releaseId: release.releaseId,
    environment: "PREVIEW",
    dryRun: true,
  });

  const snapshot = k.snapshot(missionId);
  const lineageAnswers = answerLineageQuestions(snapshot.lineage);
  const pathArtifactToDeployment = findPath(
    snapshot.lineage,
    artifact.artifactId,
    dry.deployment.deploymentId
  );

  if (!pathArtifactToDeployment) {
    errors.push("No lineage path from artifact to deployment");
  }
  if (dry.deployment.realExecution) {
    errors.push("Dry-run claimed realExecution");
  }
  if (!dry.outcome.includes("DRY_RUN")) {
    errors.push("Dry-run outcome missing DRY_RUN marker");
  }
  if (snapshot.builds.length < 2) {
    errors.push("Expected failed + success builds");
  }
  if (!preview.buildId || preview.buildId !== successBuild.buildId) {
    errors.push("Preview must reference success build");
  }

  return {
    ok: errors.length === 0,
    version: DELIVERY_MODEL_VERSION,
    missionId,
    lineageAnswers,
    pathArtifactToDeployment,
    dryRunOutcome: dry.outcome,
    realDeployClaimedOnDryRun: dry.deployment.realExecution,
    snapshot,
    errors,
  };
}
