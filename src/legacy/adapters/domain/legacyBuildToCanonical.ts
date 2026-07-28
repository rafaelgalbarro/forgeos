/**
 * Legacy CodeProject → canonical Codebase + Build (folder entities).
 * PROGRAM 6010
 */

import { Build, type BuildStatus } from "../../../core/domain/build/entity";
import {
  Codebase,
  type CodebaseKind,
  type CodebaseStatus,
} from "../../../core/domain/codebase/entity";
import {
  asBuildId,
  asCodebaseId,
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

export type LegacyCodeProjectLike = {
  projectId: string;
  missionId: string;
  ventureId?: string;
  outputId?: string;
  projectType: string;
  name: string;
  version?: string;
  status: string;
  framework?: string;
  language?: string;
  files?: { path: string; language?: string; checksum?: string }[];
  createdAt?: string;
  updatedAt?: string;
};

const KIND_MAP: Record<string, CodebaseKind> = {
  website: "WEBSITE",
  web_application: "WEB_APPLICATION",
  mobile: "MOBILE",
  backend: "BACKEND",
  fullstack: "FULLSTACK",
};

const CODEBASE_STATUS: Record<string, CodebaseStatus> = {
  DRAFT: "DRAFT",
  GENERATING: "DRAFT",
  GENERATED: "GENERATED",
  VALIDATING: "GENERATED",
  INVALID: "DRAFT",
  READY_FOR_PREVIEW: "READY_FOR_BUILD",
  CHANGES_REQUESTED: "GENERATED",
  APPROVED: "VALIDATED",
  FAILED: "DRAFT",
};

export type BuildMappingGaps = {
  notes: string[];
  buildInferred: boolean;
};

export function legacyBuildToCanonical(
  legacy: LegacyCodeProjectLike,
  context: { workspaceId: string; buildId?: string }
): { codebase: Codebase; build: Build; gaps: BuildMappingGaps } {
  const notes: string[] = [
    "Legacy CodeProject mapped to Codebase; Build is synthesized (no native build entity)",
    "Execution logs / file contents intentionally omitted from canonical aggregates",
  ];

  const kind = KIND_MAP[legacy.projectType] ?? "FULLSTACK";
  if (!KIND_MAP[legacy.projectType]) {
    notes.push(`Unknown projectType ${legacy.projectType} → FULLSTACK`);
  }

  const now = new Date().toISOString();
  const codebase = Codebase.rehydrate({
    id: asCodebaseId(legacy.projectId),
    workspaceId: asWorkspaceId(context.workspaceId),
    missionId: asMissionId(legacy.missionId),
    ventureId: legacy.ventureId ? asVentureId(legacy.ventureId) : undefined,
    outputId: legacy.outputId ? asOutputId(legacy.outputId) : undefined,
    name: legacy.name,
    kind,
    status: CODEBASE_STATUS[legacy.status] ?? "DRAFT",
    version: asVersion(legacy.version ?? "1.0.0"),
    framework: legacy.framework,
    language: legacy.language,
    fileRefs: (legacy.files ?? []).map((f) => ({
      path: f.path,
      language: f.language,
      checksum: f.checksum,
    })),
    createdAt: (legacy.createdAt ?? now) as IsoTimestamp,
    updatedAt: (legacy.updatedAt ?? now) as IsoTimestamp,
    metadata: Metadata({ mappedFrom: "CodeProject" }),
    schemaVersion: CURRENT_SCHEMA_VERSION,
  });

  const buildStatus: BuildStatus =
    legacy.status === "APPROVED" || legacy.status === "READY_FOR_PREVIEW"
      ? "SUCCEEDED"
      : legacy.status === "FAILED"
        ? "FAILED"
        : "QUEUED";

  const build = Build.rehydrate({
    id: asBuildId(context.buildId ?? `build-from-${legacy.projectId}`),
    workspaceId: asWorkspaceId(context.workspaceId),
    missionId: asMissionId(legacy.missionId),
    codebaseId: asCodebaseId(legacy.projectId),
    status: buildStatus,
    artifactDigest: buildStatus === "SUCCEEDED" ? `legacy:${legacy.projectId}` : undefined,
    createdAt: (legacy.createdAt ?? now) as IsoTimestamp,
    updatedAt: (legacy.updatedAt ?? now) as IsoTimestamp,
    metadata: Metadata({ mappedFrom: "CodeProject", synthetic: true }),
    schemaVersion: CURRENT_SCHEMA_VERSION,
  });

  return { codebase, build, gaps: { notes, buildInferred: true } };
}
