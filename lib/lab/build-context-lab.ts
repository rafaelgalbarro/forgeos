/** Build Context lab harness (Epic 6.0). */

import { createLabMockVenture, LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import {
  buildBuildContextFromVenture,
  clearBuildContextHistory,
  clearBuildContextStore,
  getBuildContextHistory,
  mergePartialSection,
  type BuildContext,
  type BuildContextSectionId,
} from "@/lib/build-platform/build-context";

export interface BuildContextLabSession {
  ventureId: string;
  context: BuildContext;
  history: ReturnType<typeof getBuildContextHistory>;
}

export function createBuildContextLab(): BuildContextLabSession {
  clearBuildContextStore();
  clearBuildContextHistory();
  const venture = createLabMockVenture();
  const context = buildBuildContextFromVenture(venture);
  return {
    ventureId: LAB_MOCK_VENTURE_ID,
    context,
    history: getBuildContextHistory(LAB_MOCK_VENTURE_ID),
  };
}

export function refreshBuildContextLab(session: BuildContextLabSession): BuildContextLabSession {
  const venture = createLabMockVenture();
  const context = buildBuildContextFromVenture(venture);
  return {
    ...session,
    context,
    history: getBuildContextHistory(session.ventureId),
  };
}

export function simulateStaleSection(
  session: BuildContextLabSession,
  sectionId: BuildContextSectionId
): BuildContextLabSession {
  const section = session.context.sections[sectionId];
  const context = mergePartialSection(
    session.context,
    sectionId,
    section.data,
    section.origin,
    "stale"
  );
  return { ...session, context };
}
