/**
 * PROGRAM 6050 — Preview Registry
 * Preview references exactly one Build.
 * No preview without valid Build unless VISUAL non-executable explicitly marked.
 */

import type { CanonicalPreview, PreviewType, PreviewStatus, CanonicalBuild } from "../types";
import { deliveryId } from "../ids";
import { isSuccessfulBuild } from "../build/registry";

export class PreviewBuildRelationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreviewBuildRelationError";
  }
}

export interface PreviewRegistry {
  create(preview: CanonicalPreview, build?: CanonicalBuild): CanonicalPreview;
  get(previewId: string): CanonicalPreview | undefined;
  listByMission(missionId: string): CanonicalPreview[];
  listByBuild(buildId: string): CanonicalPreview[];
}

export function assertPreviewBuildRelation(
  preview: Pick<CanonicalPreview, "type" | "buildId" | "visualNonExecutable">,
  build?: CanonicalBuild
): void {
  if (preview.type === "VISUAL" && preview.visualNonExecutable === true) {
    return;
  }
  if (!preview.buildId) {
    throw new PreviewBuildRelationError(
      "Preview requires buildId unless VISUAL with visualNonExecutable=true"
    );
  }
  if (!build) {
    throw new PreviewBuildRelationError(`Build ${preview.buildId} not found for preview`);
  }
  if (build.buildId !== preview.buildId) {
    throw new PreviewBuildRelationError("Preview buildId mismatch");
  }
  if (!isSuccessfulBuild(build)) {
    throw new PreviewBuildRelationError(
      `Preview requires a SUCCESS build; got ${build.result}`
    );
  }
}

export function createPreviewRegistry(): PreviewRegistry {
  const store = new Map<string, CanonicalPreview>();
  const missionIndex = new Map<string, string[]>();

  return {
    create(preview, build) {
      assertPreviewBuildRelation(preview, build);
      store.set(preview.previewId, preview);
      const ids = missionIndex.get(preview.missionId) ?? [];
      if (!ids.includes(preview.previewId)) {
        missionIndex.set(preview.missionId, [...ids, preview.previewId]);
      }
      return preview;
    },
    get(previewId) {
      return store.get(previewId);
    },
    listByMission(missionId) {
      return (missionIndex.get(missionId) ?? [])
        .map((id) => store.get(id))
        .filter(Boolean) as CanonicalPreview[];
    },
    listByBuild(buildId) {
      return Array.from(store.values()).filter((p) => p.buildId === buildId);
    },
  };
}

export function createPreview(input: {
  missionId: string;
  buildId?: string;
  type: PreviewType;
  status?: PreviewStatus;
  visualNonExecutable?: boolean;
  previewUrl?: string;
  sandboxId?: string;
}): CanonicalPreview {
  const now = new Date().toISOString();
  return {
    previewId: deliveryId("prv"),
    missionId: input.missionId,
    buildId: input.buildId,
    type: input.type,
    status: input.status ?? "PENDING",
    visualNonExecutable: input.visualNonExecutable,
    previewUrl: input.previewUrl,
    sandboxId: input.sandboxId,
    createdAt: now,
    updatedAt: now,
  };
}
