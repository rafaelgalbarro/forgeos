/**
 * PROGRAM 6050 — Creation Output → Canonical Output adapters (non-destructive).
 * Keeps adapters for all six CreationOutputType values.
 */

import type { CreationOutput, CreationOutputType } from "@/lib/creation-output/types";
import type { CanonicalOutput, OutputKind } from "../types";
import { createCanonicalOutput } from "./registry";

export const OUTPUT_KIND_ADAPTERS: readonly OutputKind[] = [
  "VENTURE_OUTPUT",
  "WEBSITE_OUTPUT",
  "WEB_APPLICATION_OUTPUT",
  "MOBILE_APPLICATION_OUTPUT",
  "BACKEND_OUTPUT",
  "DEPLOYMENT_OUTPUT",
] as const;

export function mapCreationOutputKind(type: CreationOutputType): OutputKind {
  return type;
}

export function adaptCreationOutput(legacy: CreationOutput): CanonicalOutput {
  return createCanonicalOutput({
    outputId: `can-out-${legacy.outputId}`,
    missionId: legacy.missionId,
    ventureId: legacy.ventureId,
    kind: mapCreationOutputKind(legacy.type),
    title: legacy.title,
    status: legacy.status as CanonicalOutput["status"],
    version: legacy.version,
    sourceArtifactIds: legacy.sourceArtifacts.map((a) => a.artifactId),
    previewMode: legacy.previewMode,
    previewUrl: legacy.previewUrl,
    validation: legacy.validation
      ? {
          passed: legacy.validation.passed,
          score: legacy.validation.score,
          checks: legacy.validation.checks,
        }
      : undefined,
    approvals: legacy.approvals.map((a) => ({
      id: a.id,
      status:
        a.status === "changes_requested"
          ? "pending"
          : a.status === "approved"
            ? "approved"
            : a.status === "rejected"
              ? "rejected"
              : "pending",
      requestedAt: a.requestedAt,
      resolvedAt: a.resolvedAt,
      approvedBy: a.reviewer,
      note: a.note,
    })),
    payload: legacy.payload as Record<string, unknown> | undefined,
    legacySource: {
      system: "creation-output",
      id: legacy.outputId,
      type: legacy.type,
    },
    previousVersionId: legacy.previousVersionId
      ? `can-out-${legacy.previousVersionId}`
      : undefined,
  });
}

export function adaptCreationOutputs(legacy: CreationOutput[]): CanonicalOutput[] {
  return legacy.map(adaptCreationOutput);
}

/** Typed adapter entry points (preserve per-kind contracts). */
export function adaptVentureOutput(legacy: CreationOutput): CanonicalOutput {
  if (legacy.type !== "VENTURE_OUTPUT") throw new Error("Expected VENTURE_OUTPUT");
  return adaptCreationOutput(legacy);
}
export function adaptWebsiteOutput(legacy: CreationOutput): CanonicalOutput {
  if (legacy.type !== "WEBSITE_OUTPUT") throw new Error("Expected WEBSITE_OUTPUT");
  return adaptCreationOutput(legacy);
}
export function adaptWebApplicationOutput(legacy: CreationOutput): CanonicalOutput {
  if (legacy.type !== "WEB_APPLICATION_OUTPUT") throw new Error("Expected WEB_APPLICATION_OUTPUT");
  return adaptCreationOutput(legacy);
}
export function adaptMobileApplicationOutput(legacy: CreationOutput): CanonicalOutput {
  if (legacy.type !== "MOBILE_APPLICATION_OUTPUT") throw new Error("Expected MOBILE_APPLICATION_OUTPUT");
  return adaptCreationOutput(legacy);
}
export function adaptBackendOutput(legacy: CreationOutput): CanonicalOutput {
  if (legacy.type !== "BACKEND_OUTPUT") throw new Error("Expected BACKEND_OUTPUT");
  return adaptCreationOutput(legacy);
}
export function adaptDeploymentOutput(legacy: CreationOutput): CanonicalOutput {
  if (legacy.type !== "DEPLOYMENT_OUTPUT") throw new Error("Expected DEPLOYMENT_OUTPUT");
  return adaptCreationOutput(legacy);
}

export const KIND_ADAPTER_FNS: Record<
  OutputKind,
  (legacy: CreationOutput) => CanonicalOutput
> = {
  VENTURE_OUTPUT: adaptVentureOutput,
  WEBSITE_OUTPUT: adaptWebsiteOutput,
  WEB_APPLICATION_OUTPUT: adaptWebApplicationOutput,
  MOBILE_APPLICATION_OUTPUT: adaptMobileApplicationOutput,
  BACKEND_OUTPUT: adaptBackendOutput,
  DEPLOYMENT_OUTPUT: adaptDeploymentOutput,
};
