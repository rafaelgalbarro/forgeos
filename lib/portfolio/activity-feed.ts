import type { VentureProject } from "@/lib/domain/venture";
import type { ActivityEvent, UpcomingAction } from "./types";
import { formatRelativeTime } from "./time-utils";
import { getEstimatedTimeForAction } from "./impact-engine";
import { resolveAllNextActions } from "./next-action";

function offsetTimestamp(baseIso: string, minutesAgo: number): string {
  const base = new Date(baseIso).getTime();
  return new Date(base - minutesAgo * 60_000).toISOString();
}

export function buildRecentActivity(ventures: VentureProject[]): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  if (ventures.length > 0) {
    events.push({
      id: "ceo-review",
      type: "ceo",
      label: "CEO AI revisó tu portfolio",
      timestamp: new Date().toISOString(),
      relative: "Hace un momento",
    });
  }

  for (const v of ventures) {
    const base = v.updatedAt;
    const remaining = v.discoveryContext?.remainingQuestions?.length ?? 0;

    if (remaining > 0) {
      events.push({
        id: `${v.id}-discovery-need`,
        ventureId: v.id,
        ventureName: v.name,
        type: "discovery",
        label: "Discovery necesita respuesta",
        timestamp: offsetTimestamp(base, 12),
        relative: formatRelativeTime(offsetTimestamp(base, 12)),
      });
    } else if (v.discoveryContext?.answers.length) {
      events.push({
        id: `${v.id}-discovery`,
        ventureId: v.id,
        ventureName: v.name,
        type: "discovery",
        label: "Discovery actualizado",
        timestamp: offsetTimestamp(base, 20),
        relative: formatRelativeTime(offsetTimestamp(base, 20)),
      });
    }

    if (v.ventureSimulatorResult) {
      events.push({
        id: `${v.id}-sim`,
        ventureId: v.id,
        ventureName: v.name,
        type: "simulator",
        label: "Venture Simulator recalculado",
        timestamp: offsetTimestamp(base, 8),
        relative: formatRelativeTime(offsetTimestamp(base, 8)),
      });
    }

    if (v.researchReport) {
      events.push({
        id: `${v.id}-research`,
        ventureId: v.id,
        ventureName: v.name,
        type: "research",
        label: "Research completado",
        timestamp: offsetTimestamp(base, 5),
        relative: formatRelativeTime(offsetTimestamp(base, 5)),
      });
    }

    if (v.productPRD && v.status === "ready") {
      events.push({
        id: `${v.id}-bp`,
        ventureId: v.id,
        ventureName: v.name,
        type: "build_plan",
        label: "Build Plan listo para revisar",
        timestamp: offsetTimestamp(base, 30),
        relative: formatRelativeTime(offsetTimestamp(base, 30)),
      });
    }

    if (v.status === "ready" && v.sections.length > 0) {
      events.push({
        id: `${v.id}-export`,
        ventureId: v.id,
        ventureName: v.name,
        type: "export",
        label: "Investor Pack exportado",
        timestamp: offsetTimestamp(base, 15),
        relative: formatRelativeTime(offsetTimestamp(base, 15)),
      });
    }
  }

  return events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);
}

export function buildUpcomingActions(ventures: VentureProject[]): UpcomingAction[] {
  if (ventures.length === 0) {
    return [
      {
        id: "create",
        label: "Crear tu primera empresa",
        impact: "Inicia tu portfolio en ForgeOS",
        estimatedTime: "5 min",
        priority: "alta",
        href: "/",
      },
      {
        id: "discovery",
        label: "Completar Discovery inicial",
        impact: "Desbloquea Research y validación",
        estimatedTime: "10–15 min",
        priority: "media",
        href: "/",
      },
    ];
  }

  return resolveAllNextActions(ventures)
    .slice(0, 5)
    .map((action) => ({
      id: `${action.ventureId}-${action.label}`,
      label: action.label,
      ventureName: action.ventureName,
      impact: action.impact,
      estimatedTime: getEstimatedTimeForAction(action.label),
      priority: action.priority,
      href: action.href,
    }));
}
