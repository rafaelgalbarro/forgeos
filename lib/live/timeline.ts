import type { LiveTimelineEvent } from "./types";

export function mergeAndSortTimeline(events: LiveTimelineEvent[]): LiveTimelineEvent[] {
  return [...events].sort((a, b) => {
    const [ah, am] = a.time.split(":").map(Number);
    const [bh, bm] = b.time.split(":").map(Number);
    return bh * 60 + bm - (ah * 60 + am);
  });
}

export function dedupeTimeline(events: LiveTimelineEvent[], max = 12): LiveTimelineEvent[] {
  const seen = new Set<string>();
  const result: LiveTimelineEvent[] = [];

  for (const event of events) {
    const key = `${event.department}-${event.message.slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(event);
  }

  return result.slice(0, max);
}
