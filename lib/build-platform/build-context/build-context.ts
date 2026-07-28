/** Build Context — core entity factory (Epic 6.0). */

import {
  BUILD_CONTEXT_SECTION_LABELS,
  BUILD_CONTEXT_SECTION_ORDER,
  type BuildContext,
  type BuildContextMeta,
  type BuildContextSection,
  type BuildContextSectionId,
  type BuildContextSectionStatus,
  type BuildContextSectionValidation,
} from "./types";

export function emptyValidation(): BuildContextSectionValidation {
  return { valid: false, score: 0, issues: [] };
}

export function createEmptySection(id: BuildContextSectionId): BuildContextSection {
  return {
    id,
    label: BUILD_CONTEXT_SECTION_LABELS[id],
    data: null,
    origin: "manual",
    status: "empty",
    validation: emptyValidation(),
    updatedAt: new Date().toISOString(),
  };
}

export function createEmptyBuildContext(
  ventureId: string,
  ventureName: string
): BuildContext {
  const now = new Date().toISOString();
  const sections = {} as Record<BuildContextSectionId, BuildContextSection>;

  for (const id of BUILD_CONTEXT_SECTION_ORDER) {
    sections[id] = createEmptySection(id);
  }

  const meta: BuildContextMeta = {
    ventureId,
    ventureName,
    version: 1,
    createdAt: now,
    updatedAt: now,
    completenessScore: 0,
    readyForBuild: false,
  };

  return { meta, sections };
}

export function computeCompletenessScore(context: BuildContext): number {
  const sections = BUILD_CONTEXT_SECTION_ORDER.map((id) => context.sections[id]);
  if (sections.length === 0) return 0;

  const weights: Record<BuildContextSectionStatus, number> = {
    empty: 0,
    partial: 0.5,
    complete: 1,
    stale: 0.35,
  };

  const total = sections.reduce((sum, s) => sum + weights[s.status], 0);
  return Math.round((total / sections.length) * 100);
}

export function refreshBuildContextMeta(context: BuildContext): BuildContext {
  const completenessScore = computeCompletenessScore(context);
  const productPrd = context.sections.productPrd;
  const buildPlan = context.sections.buildPlan;
  const architecture = context.sections.architecture;

  const readyForBuild =
    productPrd.status === "complete" &&
    buildPlan.status !== "empty" &&
    architecture.status !== "empty" &&
    completenessScore >= 55;

  return {
    ...context,
    meta: {
      ...context.meta,
      updatedAt: new Date().toISOString(),
      completenessScore,
      readyForBuild,
    },
  };
}
