/**
 * PROGRAM 6050 — Delivery Kernel (in-memory registries + pipeline commands).
 * Coordinates additively with Programs 6000–6040; no React.
 */

import type {
  CanonicalArtifact,
  CanonicalOutput,
  CanonicalCodebase,
  CanonicalBuild,
  CanonicalPreview,
  CanonicalRelease,
  CanonicalDeployment,
  VersionLineage,
  ChangePlan,
} from "./types";
import { DELIVERY_MODEL_VERSION } from "./types";
import {
  createArtifactRepository,
  ArtifactQueryService,
  ArtifactDependencyResolver,
  ArtifactVersionService,
  type ArtifactRepository,
} from "./artifact/registry";
import { createOutputRepository, OutputQueryService, type OutputRepository } from "./output/registry";
import { createCodebaseRepository, type CodebaseRepository } from "./codebase/registry";
import { createBuildRegistry, startBuild, type BuildRegistry } from "./build/registry";
import { createPreviewRegistry, createPreview, type PreviewRegistry } from "./preview/registry";
import {
  createReleaseRegistry,
  createReleaseDraft,
  type ReleaseRegistry,
} from "./release/registry";
import {
  createDeploymentRegistry,
  createDeployment,
  describeDeploymentOutcome,
  type DeploymentRegistry,
} from "./deployment/registry";
import { buildVersionLineage } from "./lineage/version-graph";
import { analyzeArtifactChange } from "./lineage/change-impact";
import { transitionVia } from "./pipeline";

export interface DeliveryKernel {
  version: typeof DELIVERY_MODEL_VERSION;
  artifacts: ArtifactRepository;
  artifactQuery: ArtifactQueryService;
  artifactDeps: ArtifactDependencyResolver;
  artifactVersions: ArtifactVersionService;
  outputs: OutputRepository;
  outputQuery: OutputQueryService;
  codebases: CodebaseRepository;
  builds: BuildRegistry;
  previews: PreviewRegistry;
  releases: ReleaseRegistry;
  deployments: DeploymentRegistry;

  registerArtifact(a: CanonicalArtifact): void;
  registerOutput(o: CanonicalOutput): void;
  registerCodebase(c: CanonicalCodebase): void;
  compileCodebase(input: {
    missionId: string;
    codebaseId: string;
    environment?: string;
    commands?: string[];
    succeed?: boolean;
  }): CanonicalBuild;
  createPreviewForBuild(input: {
    missionId: string;
    buildId: string;
    type?: CanonicalPreview["type"];
  }): CanonicalPreview;
  createVisualPreview(missionId: string): CanonicalPreview;
  publishRelease(input: {
    missionId: string;
    version: string;
    outputIds: string[];
    codebaseVersions: { codebaseId: string; version: string }[];
    buildIds: string[];
    changelog?: string[];
    approvedBy?: string;
  }): CanonicalRelease;
  planDeployment(input: {
    missionId: string;
    releaseId: string;
    environment: CanonicalDeployment["environment"];
    dryRun: boolean;
    approvedBy?: string;
  }): { deployment: CanonicalDeployment; outcome: string };
  lineage(missionId: string): VersionLineage;
  changeImpact(changed: CanonicalArtifact, previousChecksum?: string): ChangePlan;
  snapshot(missionId: string): DeliveryMissionSnapshot;
}

export interface DeliveryMissionSnapshot {
  missionId: string;
  artifacts: CanonicalArtifact[];
  outputs: CanonicalOutput[];
  codebases: CanonicalCodebase[];
  builds: CanonicalBuild[];
  previews: CanonicalPreview[];
  releases: CanonicalRelease[];
  deployments: CanonicalDeployment[];
  lineage: VersionLineage;
}

export function createDeliveryKernel(): DeliveryKernel {
  const artifacts = createArtifactRepository();
  const outputs = createOutputRepository();
  const codebases = createCodebaseRepository();
  const builds = createBuildRegistry();
  const previews = createPreviewRegistry();
  const releases = createReleaseRegistry();
  const deployments = createDeploymentRegistry();

  const kernel: DeliveryKernel = {
    version: DELIVERY_MODEL_VERSION,
    artifacts,
    artifactQuery: new ArtifactQueryService(artifacts),
    artifactDeps: new ArtifactDependencyResolver(artifacts),
    artifactVersions: new ArtifactVersionService(artifacts),
    outputs,
    outputQuery: new OutputQueryService(outputs),
    codebases,
    builds,
    previews,
    releases,
    deployments,

    registerArtifact(a) {
      artifacts.save(a);
    },
    registerOutput(o) {
      outputs.save(o);
    },
    registerCodebase(c) {
      codebases.save(c);
    },

    compileCodebase(input) {
      const cb = codebases.get(input.codebaseId);
      if (!cb) throw new Error(`Codebase ${input.codebaseId} not found`);
      transitionVia("Codebase", "Build");
      const running = startBuild({
        missionId: input.missionId,
        codebaseId: cb.codebaseId,
        codebaseVersion: cb.version,
        environment: input.environment ?? "local",
        commands: input.commands ?? ["npm ci", "npm run build"],
      });
      builds.record(running);
      const succeed = input.succeed !== false;
      return builds.complete(running.buildId, succeed ? "SUCCESS" : "FAILED", {
        logsRef: `logs://${running.buildId}`,
        durationMs: 12,
        validation: {
          passed: succeed,
          checks: [
            {
              id: "compile",
              label: "Compile",
              status: succeed ? "pass" : "fail",
            },
          ],
        },
        resourceUse: { memoryMb: 256 },
      });
    },

    createPreviewForBuild(input) {
      const build = builds.get(input.buildId);
      if (!build) throw new Error(`Build ${input.buildId} not found`);
      transitionVia("Build", "Preview");
      const preview = createPreview({
        missionId: input.missionId,
        buildId: input.buildId,
        type: input.type ?? "LOCAL_SANDBOX",
        status: "READY",
        previewUrl: `local://preview/${input.buildId}`,
      });
      return previews.create(preview, build);
    },

    createVisualPreview(missionId) {
      const preview = createPreview({
        missionId,
        type: "VISUAL",
        visualNonExecutable: true,
        status: "READY",
      });
      return previews.create(preview);
    },

    publishRelease(input) {
      transitionVia("Preview", "Release");
      const draft = createReleaseDraft({
        missionId: input.missionId,
        version: input.version,
        outputIds: input.outputIds,
        codebaseVersions: input.codebaseVersions,
        buildIds: input.buildIds,
        changelog: input.changelog ?? ["Initial release"],
        validation: {
          passed: true,
          checks: [{ id: "gates", label: "Quality gates", status: "pass" }],
        },
      });
      releases.saveDraft(draft);
      return releases.publish(draft.releaseId, {
        id: `apr-${draft.releaseId}`,
        status: "approved",
        requestedAt: new Date().toISOString(),
        resolvedAt: new Date().toISOString(),
        approvedBy: input.approvedBy ?? "system",
      });
    },

    planDeployment(input) {
      const release = releases.get(input.releaseId);
      if (!release) throw new Error(`Release ${input.releaseId} not found`);
      transitionVia("Release", "Deployment");
      const approval =
        input.environment === "PRODUCTION" && !input.dryRun
          ? {
              id: `apr-dep-${input.releaseId}`,
              status: "approved" as const,
              requestedAt: new Date().toISOString(),
              resolvedAt: new Date().toISOString(),
              approvedBy: input.approvedBy ?? "governor",
            }
          : undefined;
      const deployment = createDeployment({
        missionId: input.missionId,
        releaseId: input.releaseId,
        environment: input.environment,
        dryRun: input.dryRun,
        governed: input.environment === "PRODUCTION" || input.environment === "STAGING",
        approval,
        status: input.dryRun ? "PLANNED" : "IN_PROGRESS",
      });
      deployments.create(deployment, release);
      if (!input.dryRun) {
        deployments.updateStatus(deployment.deploymentId, "READY", {
          realExecution: true,
        });
      }
      const final = deployments.get(deployment.deploymentId)!;
      return { deployment: final, outcome: describeDeploymentOutcome(final) };
    },

    lineage(missionId) {
      return buildVersionLineage(missionId, {
        artifacts: artifacts.listByMission(missionId),
        outputs: outputs.listByMission(missionId),
        codebases: codebases.listByMission(missionId),
        builds: builds.listByMission(missionId),
        previews: previews.listByMission(missionId),
        releases: releases.listByMission(missionId),
        deployments: deployments.listByMission(missionId),
      });
    },

    changeImpact(changed, previousChecksum) {
      return analyzeArtifactChange({
        missionId: changed.missionId,
        changedArtifact: changed,
        previousChecksum,
        outputs: outputs.listByMission(changed.missionId),
        codebases: codebases.listByMission(changed.missionId),
      });
    },

    snapshot(missionId) {
      return {
        missionId,
        artifacts: artifacts.listByMission(missionId),
        outputs: outputs.listByMission(missionId),
        codebases: codebases.listByMission(missionId),
        builds: builds.listByMission(missionId),
        previews: previews.listByMission(missionId),
        releases: releases.listByMission(missionId),
        deployments: deployments.listByMission(missionId),
        lineage: kernel.lineage(missionId),
      };
    },
  };

  return kernel;
}
