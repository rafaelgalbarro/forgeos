/**
 * Legacy artifact mapper — from MissionArtifact / similar.
 * PROGRAM 6010 — targets folder Artifact entity.
 */

import { Artifact, type ArtifactType } from "../../../core/domain/artifact/entity";
import { asArtifactId, asMissionId, asWorkspaceId } from "../../../core/domain/shared/ids";
import {
  CURRENT_SCHEMA_VERSION,
  asVersion,
  type IsoTimestamp,
} from "../../../core/domain/shared/value-objects";
import { Metadata } from "../../../core/domain/shared/metadata";

export type LegacyArtifactLike = {
  id: string;
  type: string;
  label: string;
  phase?: string;
  source?: string;
  href?: string;
  summary?: string;
  createdAt?: string;
};

const TYPE_MAP: Record<string, ArtifactType> = {
  plan: "PLAN",
  preview: "OTHER",
  score: "SCORE",
  deployment: "OTHER",
  report: "REPORT",
  build: "OTHER",
  research: "RESEARCH",
  strategy: "STRATEGY",
  prd: "PRD",
  architecture: "ARCHITECTURE",
};

export type ArtifactMappingGaps = { notes: string[] };

export function legacyArtifactToCanonical(
  legacy: LegacyArtifactLike,
  context: { workspaceId: string; missionId?: string }
): { artifact: Artifact; gaps: ArtifactMappingGaps } {
  const notes: string[] = [];
  const mappedType = TYPE_MAP[legacy.type.toLowerCase()];
  if (!mappedType) notes.push(`Unknown artifact type ${legacy.type} → OTHER`);
  if (legacy.type === "preview" || legacy.type === "build" || legacy.type === "deployment") {
    notes.push(
      `Legacy type "${legacy.type}" is not a canonical knowledge artifact; mapped to OTHER`
    );
  }

  const now = new Date().toISOString();
  const artifact = Artifact.rehydrate({
    id: asArtifactId(legacy.id),
    workspaceId: asWorkspaceId(context.workspaceId),
    missionId: context.missionId ? asMissionId(context.missionId) : undefined,
    type: mappedType ?? "OTHER",
    title: legacy.label || legacy.id,
    summary: legacy.summary,
    status: "READY",
    version: asVersion("1.0.0"),
    contentRef: legacy.href,
    createdAt: (legacy.createdAt ?? now) as IsoTimestamp,
    updatedAt: (legacy.createdAt ?? now) as IsoTimestamp,
    metadata: Metadata({
      legacyType: legacy.type,
      legacySource: legacy.source ?? null,
      legacyPhase: legacy.phase ?? null,
    }),
    schemaVersion: CURRENT_SCHEMA_VERSION,
  });

  return { artifact, gaps: { notes } };
}
