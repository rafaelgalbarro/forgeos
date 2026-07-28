/**
 * Flow D — Artifacts adapter (ADAPTER_READY).
 * Maps MissionArtifact ↔ V2 Artifact entity fields.
 */

export interface ArtifactDto {
  id: string;
  missionId: string;
  type: string;
  label: string;
  href?: string;
  createdAt: string;
}

export type LegacyArtifactLike = {
  id: string;
  type?: string;
  kind?: string;
  label?: string;
  title?: string;
  href?: string;
  url?: string;
  createdAt?: string;
};

export function fromLegacyArtifact(missionId: string, a: LegacyArtifactLike): ArtifactDto {
  return {
    id: a.id,
    missionId,
    type: a.type || a.kind || "unknown",
    label: a.label || a.title || a.id,
    href: a.href || a.url,
    createdAt: a.createdAt || new Date(0).toISOString(),
  };
}

export function fromV2Artifact(missionId: string, a: {
  id: string;
  type?: string;
  name?: string;
  uri?: string;
  createdAt?: string;
}): ArtifactDto {
  return {
    id: String(a.id),
    missionId,
    type: a.type || "unknown",
    label: a.name || String(a.id),
    href: a.uri,
    createdAt: a.createdAt || new Date(0).toISOString(),
  };
}

/** Stub: dual-read/write not enabled until registry advances past ADAPTER_READY. */
export const ARTIFACTS_ADAPTER_STATUS = "ADAPTER_READY" as const;
