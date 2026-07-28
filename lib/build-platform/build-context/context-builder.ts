/** Build Context — builder (Epic 6.0). */

import type { VentureProject } from "@/lib/domain/venture";
import { createEmptyBuildContext, refreshBuildContextMeta } from "./build-context";
import { adaptAllSectionsFromVenture } from "./context-adapter";
import { appendBuildContextHistory } from "./context-history";
import { validateBuildContext } from "./context-validator";
import { setBuildContext, getBuildContext } from "./context-store";
import type { BuildContext, BuildContextSection } from "./types";

export interface BuildContextBuilderOptions {
  persist?: boolean;
  recordHistory?: boolean;
}

export function buildBuildContextFromVenture(
  venture: VentureProject,
  options: BuildContextBuilderOptions = {}
): BuildContext {
  const { persist = true, recordHistory = true } = options;
  const existing = getBuildContext(venture.id);
  const base = existing ?? createEmptyBuildContext(venture.id, venture.name);

  const slices = adaptAllSectionsFromVenture(venture);
  const sections = { ...base.sections };

  for (const slice of slices) {
    if (!slice) continue;
    const current = sections[slice.id];
    const next: BuildContextSection = {
      ...current,
      data: slice.data ?? null,
      origin: slice.origin,
      status: slice.status,
      sourceModule: slice.sourceModule,
      updatedAt: new Date().toISOString(),
    };
    sections[slice.id] = next;
  }

  let context: BuildContext = {
    meta: {
      ...base.meta,
      ventureName: venture.name,
      version: base.meta.version + (existing ? 1 : 0),
      updatedAt: new Date().toISOString(),
    },
    sections,
  };

  context = validateBuildContext(refreshBuildContextMeta(context));

  if (persist) setBuildContext(context);
  if (recordHistory) {
    appendBuildContextHistory(
      context,
      existing ? "updated" : "created",
      existing ? "Context rebuilt from venture" : "Initial context from venture"
    );
  }

  return context;
}

export function rebuildBuildContext(ventureId: string, venture: VentureProject): BuildContext {
  return buildBuildContextFromVenture(venture, { persist: true, recordHistory: true });
}
