/** Build Context — merge partial contexts (Epic 6.0). */

import { refreshBuildContextMeta } from "./build-context";
import { validateBuildContext } from "./context-validator";
import type {
  BuildContext,
  BuildContextMergeResult,
  BuildContextSectionId,
  BuildContextSectionStatus,
} from "./types";

const STATUS_RANK: Record<BuildContextSectionStatus, number> = {
  empty: 0,
  stale: 1,
  partial: 2,
  complete: 3,
};

function pickBetterStatus(a: BuildContextSectionStatus, b: BuildContextSectionStatus): BuildContextSectionStatus {
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
}

export function mergeBuildContexts(
  base: BuildContext,
  incoming: BuildContext,
  options?: { preferIncoming?: BuildContextSectionId[] }
): BuildContextMergeResult {
  const prefer = new Set(options?.preferIncoming ?? []);
  const mergedSections: BuildContextSectionId[] = [];
  const conflicts: string[] = [];
  const sections = { ...base.sections };

  for (const id of Object.keys(base.sections) as BuildContextSectionId[]) {
    const left = base.sections[id];
    const right = incoming.sections[id];
    if (!right) continue;

    const preferRight = prefer.has(id);
    const leftRank = STATUS_RANK[left.status];
    const rightRank = STATUS_RANK[right.status];

    if (left.status !== "empty" && right.status !== "empty" && left.data !== right.data) {
      if (leftRank === rightRank && !preferRight) {
        conflicts.push(`${id}: both contexts have data — kept base`);
      }
    }

    let chosen = left;
    if (preferRight || rightRank > leftRank) {
      chosen = right;
      mergedSections.push(id);
    } else if (rightRank === leftRank && right.updatedAt > left.updatedAt) {
      chosen = right;
      mergedSections.push(id);
    }

    sections[id] = {
      ...chosen,
      status: pickBetterStatus(left.status, right.status),
      updatedAt: new Date().toISOString(),
      origin: mergedSections.includes(id) ? "merged" : chosen.origin,
    };
  }

  const merged: BuildContext = {
    meta: {
      ...base.meta,
      ventureName: incoming.meta.ventureName || base.meta.ventureName,
      version: Math.max(base.meta.version, incoming.meta.version) + 1,
      updatedAt: new Date().toISOString(),
    },
    sections,
  };

  const validated = validateBuildContext(refreshBuildContextMeta(merged));

  return {
    context: validated,
    mergedSections,
    conflicts,
  };
}

export function mergePartialSection(
  context: BuildContext,
  sectionId: BuildContextSectionId,
  data: unknown,
  origin: BuildContext["sections"][BuildContextSectionId]["origin"],
  status: BuildContextSectionStatus
): BuildContext {
  const next: BuildContext = {
    ...context,
    sections: {
      ...context.sections,
      [sectionId]: {
        ...context.sections[sectionId],
        data,
        origin,
        status,
        updatedAt: new Date().toISOString(),
      },
    },
  };
  return validateBuildContext(refreshBuildContextMeta(next));
}
