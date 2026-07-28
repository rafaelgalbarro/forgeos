import type { VentureProject } from "@/lib/domain/venture";
import type { ActivityEvent, ActivityEventType } from "./types";
import { formatRelativeTime } from "./time-utils";

function offsetTimestamp(baseIso: string, minutesAgo: number): string {
  const base = new Date(baseIso).getTime();
  return new Date(base - minutesAgo * 60_000).toISOString();
}

function pushEvent(
  events: ActivityEvent[],
  venture: VentureProject,
  type: ActivityEventType,
  label: string,
  timestamp: string,
  suffix: string
): void {
  events.push({
    id: `${venture.id}-${type}-${suffix}`,
    ventureId: venture.id,
    ventureName: venture.name,
    type,
    label,
    timestamp,
    relative: formatRelativeTime(timestamp),
  });
}

export function buildActivityFeed(ventures: VentureProject[]): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const v of ventures) {
    const base = v.updatedAt;

    if (v.researchReport) {
      pushEvent(events, v, "research", "Research completado", offsetTimestamp(base, 5), "r");
    }
    if (v.productPRD) {
      pushEvent(events, v, "product", "PRD generado", offsetTimestamp(base, 12), "p");
    }
    if (v.discoveryContext?.answers.length) {
      pushEvent(events, v, "discovery", "Discovery actualizado", offsetTimestamp(base, 20), "d");
    }
    if (v.status === "ready" && v.sections.length > 0) {
      pushEvent(events, v, "build_plan", "Build Plan creado", offsetTimestamp(base, 30), "bp");
      pushEvent(events, v, "export", "Investor Pack generado", offsetTimestamp(base, 15), "ex");
    }
    if (v.ventureSimulatorResult) {
      pushEvent(events, v, "simulator", "Venture Simulator actualizado", offsetTimestamp(base, 8), "s");
    }
    if (v.status === "building") {
      pushEvent(events, v, "build", "Workflow en progreso", offsetTimestamp(base, 3), "b");
    }
    if (events.filter((e) => e.ventureId === v.id).length === 0) {
      pushEvent(events, v, "venture", "Empresa actualizada", base, "v");
    }
  }

  return events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 12);
}
