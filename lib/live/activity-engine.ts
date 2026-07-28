import type { VentureProject } from "@/lib/domain/venture";
import {
  generateAbsenceSummary,
  generateVenturePulses,
  generateVentureTimelineEvents,
} from "./activity-generator";
import { dedupeTimeline, mergeAndSortTimeline } from "./timeline";
import type { LiveActivitySnapshot } from "./types";

export function buildLiveActivitySnapshot(ventures: VentureProject[]): LiveActivitySnapshot {
  const baseDate = new Date();
  const allEvents = ventures.flatMap((v) => generateVentureTimelineEvents(v, baseDate));
  const timeline = dedupeTimeline(mergeAndSortTimeline(allEvents));

  const venturePulses: Record<string, ReturnType<typeof generateVenturePulses>> = {};
  for (const v of ventures) {
    venturePulses[v.id] = generateVenturePulses(v);
  }

  return {
    timeline,
    absenceSummary: generateAbsenceSummary(ventures),
    venturePulses,
  };
}
