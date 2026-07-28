/**
 * PROGRAM 6050 — Delivery model tests
 * lineage, versioning, build immutability, preview/build relation,
 * release immutability, deployment relation, change impact, migration
 *
 * Run: npx tsx src/core/delivery/__tests__/delivery-model-6050.test.ts
 */

import assert from "node:assert/strict";
import {
  createDeliveryKernel,
  createArtifact,
  createCanonicalOutput,
  createCanonicalCodebase,
  createBuildRegistry,
  startBuild,
  BuildImmutabilityError,
  createPreviewRegistry,
  createPreview,
  PreviewBuildRelationError,
  createReleaseRegistry,
  createReleaseDraft,
  ReleaseImmutabilityError,
  createDeploymentRegistry,
  createDeployment,
  DeploymentRelationError,
  describeDeploymentOutcome,
  analyzeArtifactChange,
  migrateDeliveryModel,
  runDeliveryPipelineE2E,
  DELIVERY_MODEL_VERSION,
  DELIVERY_PIPELINE,
  PIPELINE_TRANSITIONS,
  adaptCreationOutput,
  adaptCodeProject,
  shouldReuseCodebase,
} from "../index";
import type { CreationOutput } from "@/lib/creation-output/types";
import type { CodeProject } from "@/lib/code-generation/types";

function section(name: string) {
  console.log(`\n▸ ${name}`);
}

async function main() {
  let failed = 0;
  const check = (label: string, cond: boolean, detail?: string) => {
    if (cond) console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ""}`);
    else {
      console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
      failed += 1;
    }
  };

  section("Pipeline separation");
  check("7 stages", DELIVERY_PIPELINE.length === 7);
  check("6 transitions", PIPELINE_TRANSITIONS.length === 6);
  check(
    "concepts distinct labels",
    new Set(DELIVERY_PIPELINE).size === 7
  );

  section("Build immutability");
  {
    const builds = createBuildRegistry();
    const running = startBuild({
      missionId: "m1",
      codebaseId: "cb1",
      codebaseVersion: "1.0.0",
      environment: "local",
      commands: ["npm run build"],
    });
    builds.record(running);
    const failedBuild = builds.complete(running.buildId, "FAILED");
    check("failed recorded", failedBuild.result === "FAILED");
    let threw = false;
    try {
      builds.complete(running.buildId, "SUCCESS");
    } catch (e) {
      threw = e instanceof BuildImmutabilityError;
    }
    check("cannot overwrite failed→success", threw);
    const second = startBuild({
      missionId: "m1",
      codebaseId: "cb1",
      codebaseVersion: "1.0.0",
      environment: "local",
      commands: ["npm run build"],
    });
    builds.record(second);
    builds.complete(second.buildId, "SUCCESS");
    check("new build can succeed", builds.get(second.buildId)?.result === "SUCCESS");
  }

  section("Preview / Build relation");
  {
    const builds = createBuildRegistry();
    const previews = createPreviewRegistry();
    const b = startBuild({
      missionId: "m1",
      codebaseId: "cb1",
      codebaseVersion: "1.0.0",
      environment: "local",
      commands: ["build"],
    });
    builds.record(b);
    builds.complete(b.buildId, "SUCCESS");
    const okPreview = createPreview({
      missionId: "m1",
      buildId: b.buildId,
      type: "LOCAL_SANDBOX",
    });
    previews.create(okPreview, builds.get(b.buildId));
    check("preview with success build", true);

    let threw = false;
    try {
      previews.create(
        createPreview({ missionId: "m1", type: "LOCAL_SANDBOX" }),
        undefined
      );
    } catch (e) {
      threw = e instanceof PreviewBuildRelationError;
    }
    check("blocks preview without build", threw);

    const visual = createPreview({
      missionId: "m1",
      type: "VISUAL",
      visualNonExecutable: true,
    });
    previews.create(visual);
    check("allows VISUAL non-executable", true);
  }

  section("Release immutability");
  {
    const releases = createReleaseRegistry();
    const draft = createReleaseDraft({
      missionId: "m1",
      version: "1.0.0",
      outputIds: ["o1"],
      codebaseVersions: [{ codebaseId: "cb1", version: "1.0.0" }],
      buildIds: ["b1"],
    });
    releases.saveDraft(draft);
    const published = releases.publish(draft.releaseId, {
      id: "apr1",
      status: "approved",
      requestedAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString(),
      approvedBy: "test",
    });
    check("published immutable", published.immutable === true);
    let threw = false;
    try {
      releases.saveDraft({ ...published, changelog: ["hack"] });
    } catch (e) {
      threw = e instanceof ReleaseImmutabilityError;
    }
    check("cannot mutate published", threw);
  }

  section("Deployment / Release relation + dry-run");
  {
    const releases = createReleaseRegistry();
    const deployments = createDeploymentRegistry();
    const draft = createReleaseDraft({
      missionId: "m1",
      version: "1.0.0",
      outputIds: [],
      codebaseVersions: [],
      buildIds: ["b1"],
    });
    releases.saveDraft(draft);
    const rel = releases.publish(draft.releaseId);
    const dry = createDeployment({
      missionId: "m1",
      releaseId: rel.releaseId,
      environment: "PREVIEW",
      dryRun: true,
    });
    deployments.create(dry, rel);
    const outcome = describeDeploymentOutcome(dry);
    check("dry-run outcome marked", outcome.includes("DRY_RUN"));
    check("dry-run not real", dry.realExecution === false);

    let threw = false;
    try {
      deployments.create(
        {
          ...createDeployment({
            missionId: "m1",
            releaseId: rel.releaseId,
            environment: "PRODUCTION",
            dryRun: false,
          }),
          governed: false,
        },
        rel
      );
    } catch (e) {
      threw = e instanceof DeploymentRelationError;
    }
    check("production requires governance", threw);
  }

  section("Change impact");
  {
    const art = createArtifact({
      missionId: "m1",
      kind: "DOCUMENT",
      title: "Spec",
      status: "READY",
      version: "1.0.0",
      checksum: "a",
    });
    const out = createCanonicalOutput({
      missionId: "m1",
      kind: "WEBSITE_OUTPUT",
      title: "Web",
      status: "APPROVED",
      version: "1.0.0",
      sourceArtifactIds: [art.artifactId],
    });
    const cb = createCanonicalCodebase({
      missionId: "m1",
      outputId: out.outputId,
      name: "web",
      slug: "web",
      version: "1.0.0",
      status: "APPROVED",
      framework: "next",
      language: "ts",
      packageManager: "npm",
      files: [],
      directories: [],
      dependencies: [],
      scripts: [],
      environmentVariables: [],
      sourceArtifactIds: [art.artifactId],
    });
    const noChange = analyzeArtifactChange({
      missionId: "m1",
      changedArtifact: art,
      previousChecksum: "a",
      outputs: [out],
      codebases: [cb],
    });
    check("checksum match → no invalidate", noChange.invalidate === false);

    const changed = analyzeArtifactChange({
      missionId: "m1",
      changedArtifact: { ...art, checksum: "b" },
      previousChecksum: "a",
      outputs: [out],
      codebases: [cb],
    });
    check("change invalidates", changed.invalidate === true);
    check("approval required for approved downstream", changed.approvalRequired === true);
  }

  section("Migration");
  {
    const legacyOutput: CreationOutput = {
      outputId: "legacy-out-1",
      missionId: "m-mig",
      type: "WEBSITE_OUTPUT",
      title: "Legacy Web",
      status: "PREVIEW_READY",
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceArtifacts: [
        { artifactId: "art-legacy-1", type: "website", label: "Web art" },
      ],
      previewMode: "mock",
      files: [],
      routes: [],
      screenshots: [],
      approvals: [],
      warnings: [],
      nextActions: [],
    };
    const legacyProject: CodeProject = {
      projectId: "legacy-proj-1",
      missionId: "m-mig",
      projectType: "website",
      name: "Legacy",
      slug: "legacy",
      version: "1.0.0",
      framework: "nextjs",
      language: "typescript",
      packageManager: "npm",
      files: [
        {
          path: "a.ts",
          language: "typescript",
          content: "export {}",
          purpose: "x",
          generatedBy: "template",
          sourceArtifactIds: ["art-legacy-1"],
          checksum: "c1",
          editable: true,
          status: "GENERATED",
        },
      ],
      directories: [],
      dependencies: [],
      scripts: [],
      environmentVariables: [],
      routes: [],
      documentation: { readme: "", envExample: "" },
      warnings: [],
      status: "GENERATED",
      templateId: "website-nextjs",
      generationMode: "template",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = migrateDeliveryModel({
      missionId: "m-mig",
      creationOutputs: [legacyOutput],
      codeProjects: [legacyProject],
      orphanLegacyIds: [{ system: "unknown", id: "orphan-1" }],
    });
    check("migrated outputs", result.report.counts.migrated >= 2);
    check("orphaned counted", result.report.counts.orphaned === 1);
    check("canonical output adapted", result.outputs.length === 1);
    check("canonical codebase adapted", result.codebases.length === 1);
    const adaptedOut = adaptCreationOutput(legacyOutput);
    check("adapter preserves legacy id", adaptedOut.legacySource?.id === "legacy-out-1");
    const adaptedCb = adaptCodeProject(legacyProject);
    check("code adapter preserves files", adaptedCb.files.length === 1);
    check("reuse valid codebase", shouldReuseCodebase(adaptedCb) === true);
  }

  section("Versioning + lineage E2E");
  {
    const kernel = createDeliveryKernel();
    const e2e = runDeliveryPipelineE2E(kernel);
    check("e2e ok", e2e.ok, e2e.errors.join("; ") || undefined);
    check("version string", e2e.version === DELIVERY_MODEL_VERSION);
    check("path artifact→deployment", (e2e.pathArtifactToDeployment?.length ?? 0) >= 2);
    check("dry-run not real", e2e.realDeployClaimedOnDryRun === false);
    check("builds include failed+success", e2e.snapshot.builds.length >= 2);

    const art = e2e.snapshot.artifacts[0];
    assert.ok(art);
    const next = kernel.artifactVersions.createVersion(art, {
      title: art.title + " v2",
      checksum: "new",
    });
    check("version bumped", next.version !== art.version);
    check("previous superseded", kernel.artifacts.get(art.artifactId)?.status === "SUPERSEDED");
  }

  console.log(`\n${failed === 0 ? "✓" : "✗"} PROGRAM 6050 tests — failures=${failed}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
