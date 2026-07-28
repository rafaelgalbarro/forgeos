/**
 * PROGRAM 6050 — Application-layer delivery commands (additive to 6020).
 * Zero React.
 */

import type { DeliveryKernel } from "../delivery/kernel";
import type { CanonicalArtifact, CanonicalOutput, CanonicalCodebase } from "../delivery/types";

export type DeliveryCommandName =
  | "RegisterArtifact"
  | "CreateOutputFromArtifacts"
  | "RegisterCodebase"
  | "StartBuild"
  | "CreatePreview"
  | "CreateRelease"
  | "DeployRelease"
  | "AnalyzeChangeImpact"
  | "GetLineage";

export interface DeliveryCommand<TPayload = Record<string, unknown>> {
  name: DeliveryCommandName;
  missionId: string;
  requestedBy: string;
  payload: TPayload;
  dryRun?: boolean;
}

export interface DeliveryCommandResult {
  ok: boolean;
  command: DeliveryCommandName;
  missionId: string;
  message: string;
  data?: Record<string, unknown>;
}

export function dispatchDeliveryCommand(
  kernel: DeliveryKernel,
  command: DeliveryCommand
): DeliveryCommandResult {
  const { name, missionId, payload, dryRun } = command;
  try {
    switch (name) {
      case "RegisterArtifact": {
        const artifact = payload.artifact as CanonicalArtifact;
        kernel.registerArtifact(artifact);
        return ok(name, missionId, "Artifact registered", { artifactId: artifact.artifactId });
      }
      case "CreateOutputFromArtifacts": {
        const output = payload.output as CanonicalOutput;
        kernel.registerOutput(output);
        return ok(name, missionId, "Output registered", { outputId: output.outputId });
      }
      case "RegisterCodebase": {
        const codebase = payload.codebase as CanonicalCodebase;
        kernel.registerCodebase(codebase);
        return ok(name, missionId, "Codebase registered", { codebaseId: codebase.codebaseId });
      }
      case "StartBuild": {
        const build = kernel.compileCodebase({
          missionId,
          codebaseId: String(payload.codebaseId),
          succeed: payload.succeed !== false,
          environment: typeof payload.environment === "string" ? payload.environment : undefined,
        });
        return ok(name, missionId, `Build ${build.result}`, { buildId: build.buildId, result: build.result });
      }
      case "CreatePreview": {
        if (payload.visual === true) {
          const p = kernel.createVisualPreview(missionId);
          return ok(name, missionId, "Visual preview created", { previewId: p.previewId });
        }
        const p = kernel.createPreviewForBuild({
          missionId,
          buildId: String(payload.buildId),
        });
        return ok(name, missionId, "Preview created", { previewId: p.previewId, buildId: p.buildId });
      }
      case "CreateRelease": {
        const release = kernel.publishRelease({
          missionId,
          version: String(payload.version ?? "1.0.0"),
          outputIds: (payload.outputIds as string[]) ?? [],
          codebaseVersions: (payload.codebaseVersions as { codebaseId: string; version: string }[]) ?? [],
          buildIds: (payload.buildIds as string[]) ?? [],
          changelog: payload.changelog as string[] | undefined,
          approvedBy: command.requestedBy,
        });
        return ok(name, missionId, "Release published", { releaseId: release.releaseId });
      }
      case "DeployRelease": {
        const result = kernel.planDeployment({
          missionId,
          releaseId: String(payload.releaseId),
          environment: (payload.environment as "LOCAL" | "SANDBOX" | "PREVIEW" | "STAGING" | "PRODUCTION") ?? "PREVIEW",
          dryRun: dryRun !== false,
          approvedBy: command.requestedBy,
        });
        return ok(name, missionId, result.outcome, {
          deploymentId: result.deployment.deploymentId,
          dryRun: result.deployment.dryRun,
          realExecution: result.deployment.realExecution,
        });
      }
      case "AnalyzeChangeImpact": {
        const artifact = payload.artifact as CanonicalArtifact;
        const plan = kernel.changeImpact(artifact, payload.previousChecksum as string | undefined);
        return ok(name, missionId, "Change plan created", { plan });
      }
      case "GetLineage": {
        const lineage = kernel.lineage(missionId);
        return ok(name, missionId, "Lineage resolved", { lineage });
      }
      default:
        return {
          ok: false,
          command: name,
          missionId,
          message: `Unknown delivery command: ${name as string}`,
        };
    }
  } catch (e) {
    return {
      ok: false,
      command: name,
      missionId,
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

function ok(
  command: DeliveryCommandName,
  missionId: string,
  message: string,
  data?: Record<string, unknown>
): DeliveryCommandResult {
  return { ok: true, command, missionId, message, data };
}
