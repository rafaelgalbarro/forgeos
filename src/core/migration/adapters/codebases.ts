/**
 * Flow F — Codebases adapter (ADAPTER_READY / documented stub).
 * CodeProject (lib/code-generation) ↔ V2 Codebase aggregate.
 */

export interface CodebaseDto {
  id: string;
  missionId: string;
  slug: string;
  framework: string;
  fileCount: number;
  updatedAt: string;
}

export type LegacyCodeProjectLike = {
  id: string;
  missionId?: string;
  slug?: string;
  name?: string;
  framework?: string;
  stack?: string;
  files?: unknown[];
  updatedAt?: string;
};

export function fromLegacyCodeProject(p: LegacyCodeProjectLike): CodebaseDto {
  return {
    id: p.id,
    missionId: p.missionId || "",
    slug: p.slug || p.name || p.id,
    framework: p.framework || p.stack || "unknown",
    fileCount: Array.isArray(p.files) ? p.files.length : 0,
    updatedAt: p.updatedAt || new Date(0).toISOString(),
  };
}

export const CODEBASES_ADAPTER_STATUS = "ADAPTER_READY" as const;
export const CODEBASES_STUB_NOTE =
  "Dual-read not enabled yet — ENABLE_V2_STUDIO remains false. Wire after code-repository V2 port.";
