/**
 * Flow G — Builds adapter (ADAPTER_READY).
 */

export interface BuildDto {
  id: string;
  missionId: string;
  status: string;
  environment: string;
  updatedAt: string;
}

export type LegacyBuildSnapshotLike = {
  id?: string;
  buildId?: string;
  missionId?: string;
  status?: string;
  phase?: string;
  environment?: string;
  updatedAt?: string;
};

export function fromLegacyBuildSnapshot(s: LegacyBuildSnapshotLike): BuildDto {
  return {
    id: s.id || s.buildId || "unknown",
    missionId: s.missionId || "",
    status: s.status || s.phase || "unknown",
    environment: s.environment || "preview",
    updatedAt: s.updatedAt || new Date(0).toISOString(),
  };
}

export const BUILDS_ADAPTER_STATUS = "ADAPTER_READY" as const;
