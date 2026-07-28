/**
 * PROGRAM 6050 — Release Registry
 * Immutable once published — outputs, codebase versions, build IDs, approval, changelog, validation, rollback refs.
 */

import type { CanonicalRelease, ApprovalRecord, ValidationSummary } from "../types";
import { deliveryId } from "../ids";

export class ReleaseImmutabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReleaseImmutabilityError";
  }
}

export interface ReleaseRegistry {
  saveDraft(release: CanonicalRelease): CanonicalRelease;
  publish(releaseId: string, approval?: ApprovalRecord): CanonicalRelease;
  get(releaseId: string): CanonicalRelease | undefined;
  listByMission(missionId: string): CanonicalRelease[];
  /** Forbidden: mutate published release fields except status→SUPERSEDED/ROLLED_BACK */
  supersede(releaseId: string): CanonicalRelease;
}

export function createReleaseRegistry(): ReleaseRegistry {
  const store = new Map<string, CanonicalRelease>();
  const missionIndex = new Map<string, string[]>();

  function index(r: CanonicalRelease): void {
    store.set(r.releaseId, r);
    const ids = missionIndex.get(r.missionId) ?? [];
    if (!ids.includes(r.releaseId)) {
      missionIndex.set(r.missionId, [...ids, r.releaseId]);
    }
  }

  return {
    saveDraft(release) {
      const existing = store.get(release.releaseId);
      if (existing?.immutable) {
        throw new ReleaseImmutabilityError(
          `Release ${release.releaseId} is published/immutable — create a new release`
        );
      }
      const draft: CanonicalRelease = { ...release, immutable: false, status: release.status ?? "DRAFT" };
      index(draft);
      return draft;
    },

    publish(releaseId, approval) {
      const existing = store.get(releaseId);
      if (!existing) throw new ReleaseImmutabilityError(`Release ${releaseId} not found`);
      if (existing.immutable) {
        throw new ReleaseImmutabilityError(`Release ${releaseId} already published`);
      }
      const published: CanonicalRelease = {
        ...existing,
        status: "PUBLISHED",
        approval: approval ?? existing.approval,
        publishedAt: new Date().toISOString(),
        immutable: true,
      };
      store.set(releaseId, published);
      return published;
    },

    get(releaseId) {
      return store.get(releaseId);
    },

    listByMission(missionId) {
      return (missionIndex.get(missionId) ?? [])
        .map((id) => store.get(id))
        .filter(Boolean) as CanonicalRelease[];
    },

    supersede(releaseId) {
      const existing = store.get(releaseId);
      if (!existing) throw new ReleaseImmutabilityError(`Release ${releaseId} not found`);
      if (!existing.immutable) {
        throw new ReleaseImmutabilityError(`Release ${releaseId} is not published`);
      }
      const next: CanonicalRelease = { ...existing, status: "SUPERSEDED" };
      store.set(releaseId, next);
      return next;
    },
  };
}

export function createReleaseDraft(input: {
  missionId: string;
  version: string;
  outputIds: string[];
  codebaseVersions: { codebaseId: string; version: string }[];
  buildIds: string[];
  changelog?: string[];
  validation?: ValidationSummary;
  rollbackRefs?: string[];
}): CanonicalRelease {
  return {
    releaseId: deliveryId("rel"),
    missionId: input.missionId,
    version: input.version,
    status: "DRAFT",
    outputIds: input.outputIds,
    codebaseVersions: input.codebaseVersions,
    buildIds: input.buildIds,
    changelog: input.changelog ?? [],
    validation: input.validation,
    rollbackRefs: input.rollbackRefs ?? [],
    createdAt: new Date().toISOString(),
    immutable: false,
  };
}
