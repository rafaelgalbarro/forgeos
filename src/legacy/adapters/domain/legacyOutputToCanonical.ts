/**
 * Legacy CreationOutput → canonical Output (folder entity).
 * PROGRAM 6010
 */

import { Output, type OutputStatus, type OutputType } from "../../../core/domain/output/entity";
import {
  asArtifactId,
  asMissionId,
  asOutputId,
  asVentureId,
  asWorkspaceId,
} from "../../../core/domain/shared/ids";
import {
  CURRENT_SCHEMA_VERSION,
  asVersion,
  type IsoTimestamp,
} from "../../../core/domain/shared/value-objects";
import { Metadata } from "../../../core/domain/shared/metadata";

export type LegacyOutputLike = {
  outputId: string;
  missionId: string;
  ventureId?: string;
  type: string;
  title: string;
  status: string;
  version?: string;
  createdAt?: string;
  updatedAt?: string;
  previewUrl?: string;
  sourceArtifacts?: { artifactId: string }[];
};

const TYPE_MAP: Record<string, OutputType> = {
  VENTURE_OUTPUT: "VENTURE_OUTPUT",
  WEBSITE_OUTPUT: "WEBSITE_OUTPUT",
  WEB_APPLICATION_OUTPUT: "WEB_APPLICATION_OUTPUT",
  MOBILE_APPLICATION_OUTPUT: "MOBILE_APPLICATION_OUTPUT",
  BACKEND_OUTPUT: "BACKEND_OUTPUT",
  DEPLOYMENT_OUTPUT: "DEPLOYMENT_OUTPUT",
};

const STATUS_MAP: Record<string, OutputStatus> = {
  DRAFT: "DRAFT",
  GENERATING: "GENERATING",
  PREVIEW_READY: "PREVIEW_READY",
  VALIDATING: "VALIDATING",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  APPROVED: "APPROVED",
  EXPORT_READY: "EXPORT_READY",
  DEPLOYMENT_READY: "DEPLOYMENT_READY",
  FAILED: "FAILED",
};

export type OutputMappingGaps = { notes: string[]; payloadDropped: boolean };

export function legacyOutputToCanonical(
  legacy: LegacyOutputLike,
  context: { workspaceId: string }
): { output: Output; gaps: OutputMappingGaps } {
  const notes: string[] = [];
  const type = TYPE_MAP[legacy.type];
  if (!type) {
    notes.push(`Unknown output type ${legacy.type}; defaulting VENTURE_OUTPUT`);
  }
  const status = STATUS_MAP[legacy.status] ?? "DRAFT";
  if (!STATUS_MAP[legacy.status]) notes.push(`Unknown status ${legacy.status} → DRAFT`);

  notes.push("CreationOutput.payload / files / routes not carried into canonical Output");

  const now = new Date().toISOString();
  const output = Output.rehydrate({
    id: asOutputId(legacy.outputId),
    workspaceId: asWorkspaceId(context.workspaceId),
    missionId: asMissionId(legacy.missionId),
    ventureId: legacy.ventureId ? asVentureId(legacy.ventureId) : undefined,
    type: type ?? "VENTURE_OUTPUT",
    title: legacy.title,
    status,
    version: asVersion(legacy.version ?? "1.0.0"),
    sourceArtifactIds: (legacy.sourceArtifacts ?? []).map((a) => asArtifactId(a.artifactId)),
    previewUrl: legacy.previewUrl,
    createdAt: (legacy.createdAt ?? now) as IsoTimestamp,
    updatedAt: (legacy.updatedAt ?? now) as IsoTimestamp,
    metadata: Metadata({ mappedFrom: "CreationOutput" }),
    schemaVersion: CURRENT_SCHEMA_VERSION,
  });

  return { output, gaps: { notes, payloadDropped: true } };
}
