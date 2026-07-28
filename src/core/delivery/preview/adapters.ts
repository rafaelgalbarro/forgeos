/**
 * PROGRAM 6050 — Preview Runtime → Canonical Preview adapter.
 */

import type { PreviewSandbox, PreviewBuildResult } from "@/lib/preview-runtime/types";
import type { CanonicalPreview, CanonicalBuild } from "../types";
import { createPreview } from "./registry";
import { deliveryId } from "../ids";

export function adaptPreviewSandbox(
  sandbox: PreviewSandbox,
  options?: { buildId?: string; visualNonExecutable?: boolean }
): CanonicalPreview {
  const type =
    sandbox.isolation === "unavailable"
      ? "VISUAL"
      : sandbox.previewUrl?.startsWith("http")
        ? "REMOTE_PREVIEW"
        : "LOCAL_SANDBOX";

  return createPreview({
    missionId: sandbox.missionId,
    buildId: options?.buildId,
    type,
    status: mapSandboxStatus(sandbox.status),
    visualNonExecutable: options?.visualNonExecutable ?? type === "VISUAL",
    previewUrl: sandbox.previewUrl,
    sandboxId: sandbox.id,
  });
}

export function adaptSandboxBuildToCanonical(
  sandbox: PreviewSandbox,
  codebaseId: string,
  codebaseVersion: string
): CanonicalBuild | undefined {
  const build = sandbox.build;
  if (!build) return undefined;
  return {
    buildId: deliveryId("bld"),
    missionId: sandbox.missionId,
    codebaseId,
    codebaseVersion,
    environment: "sandbox",
    commands: ["npm install", "npm run build"],
    logsRef: `sandbox:${sandbox.id}:build`,
    result: mapBuildResult(build),
    durationMs: build.durationMs,
    validation: {
      passed: build.status === "BUILD_PASSED",
      checks: [
        {
          id: "sandbox-build",
          label: "Sandbox build",
          status: build.status === "BUILD_PASSED" ? "pass" : "fail",
          detail: build.status,
        },
      ],
    },
    resourceUse: {
      cpuPercent: sandbox.resources.cpuPercent,
      memoryMb: sandbox.resources.memoryMb,
      diskMb: sandbox.resources.diskMb,
    },
    createdAt: sandbox.createdAt,
    completedAt: sandbox.updatedAt,
    immutable: true,
    legacySource: { system: "preview-runtime", id: sandbox.id },
  };
}

function mapSandboxStatus(status: PreviewSandbox["status"]): CanonicalPreview["status"] {
  switch (status) {
    case "READY":
      return "READY";
    case "DEGRADED":
      return "DEGRADED";
    case "FAILED":
      return "FAILED";
    case "STOPPED":
    case "STOPPING":
      return "STOPPED";
    case "EXPIRED":
      return "EXPIRED";
    default:
      return "PENDING";
  }
}

function mapBuildResult(build: PreviewBuildResult): CanonicalBuild["result"] {
  switch (build.status) {
    case "BUILD_PASSED":
      return "SUCCESS";
    case "BUILD_FAILED":
      return "FAILED";
    case "BUILD_TIMEOUT":
      return "TIMEOUT";
    case "BUILD_SKIPPED":
      return "CANCELLED";
    default:
      return "FAILED";
  }
}
