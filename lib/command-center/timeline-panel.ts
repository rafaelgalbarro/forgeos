/** Program 4500 — Timeline panel. */

import type { VentureProject } from "@/lib/domain/venture";
import { buildFounderActivitySection } from "@/lib/founder-dashboard";
import type { TimelineItem } from "./types";

export function buildTimelinePanel(ventures: VentureProject[]): TimelineItem[] {
  const activity = buildFounderActivitySection(ventures);
  return activity.items.map((item) => ({
    id: item.id,
    label: item.label,
    ventureName: item.ventureName,
    relative: item.relative,
    href: item.href,
  }));
}
