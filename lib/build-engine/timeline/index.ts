import type { VentureProject } from "@/lib/domain/venture";
import type { BuildTimelineEvent } from "../types";
import { resolveQueueState } from "../planner";

const STATE_ORDER = ["Pending", "Planning", "Building", "Testing", "Deploying", "Live"] as const;

export function buildTimeline(ventures: VentureProject[]): BuildTimelineEvent[] {
  const events: BuildTimelineEvent[] = [];

  for (const v of ventures) {
    const currentState = resolveQueueState(v);
    const currentIdx = STATE_ORDER.indexOf(currentState);

    for (let i = 0; i <= currentIdx; i++) {
      const state = STATE_ORDER[i];
      const daysAgo = (currentIdx - i) * 2;
      const ts = new Date(Date.now() - daysAgo * 86_400_000).toISOString();

      events.push({
        id: `tl-${v.id}-${state}`,
        ventureId: v.id,
        label: `${v.name} → ${state}`,
        state,
        timestamp: ts,
      });
    }
  }

  return events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
