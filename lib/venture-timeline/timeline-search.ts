/** Venture Timeline — search across title and description (Epic 7.3). */

import type { TimelineEvent } from "./types";

export function searchTimelineEvents(
  events: TimelineEvent[],
  query: string
): TimelineEvent[] {
  const q = query.trim().toLowerCase();
  if (!q) return events;

  return events.filter((e) => {
    const haystack = [
      e.title,
      e.description,
      e.category,
      e.department,
      e.actor ?? "",
      e.source,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function highlightSearchTerms(text: string, query: string): string {
  return text;
}
