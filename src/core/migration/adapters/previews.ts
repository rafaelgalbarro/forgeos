/**
 * Flow H — Previews adapter (NOT_STARTED / documented stub).
 * Do not enable dual-read until preview repository is production-ready.
 */

export interface PreviewDto {
  id: string;
  missionId: string;
  url?: string;
  status: string;
  updatedAt: string;
}

export const PREVIEWS_ADAPTER_STATUS = "NOT_STARTED" as const;
export const PREVIEWS_STUB_NOTE =
  "Stub — map getLatestSandboxBuildForMission ↔ V2 Preview entity after DualRead gate.";

export function fromLegacySandboxBuild(b: {
  id: string;
  missionId?: string;
  previewUrl?: string;
  url?: string;
  status?: string;
  updatedAt?: string;
}): PreviewDto {
  return {
    id: b.id,
    missionId: b.missionId || "",
    url: b.previewUrl || b.url,
    status: b.status || "unknown",
    updatedAt: b.updatedAt || new Date(0).toISOString(),
  };
}
