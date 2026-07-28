import type { VentureProject } from "@/lib/domain/venture";
import { buildUpcomingActions } from "@/lib/portfolio/activity-feed";
import { getEstimatedTimeForAction } from "@/lib/portfolio/impact-engine";
import { resolveAllNextActions } from "@/lib/portfolio/next-action";
import type { FounderCalendarSection } from "./types";

const SLOT_LABELS = ["09:00", "10:30", "12:00", "15:00", "17:00", "18:30"];

function shortName(name: string): string {
  return name.length > 40 ? `${name.slice(0, 37)}…` : name;
}

function formatDateLabel(): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

export function buildFounderCalendarSection(ventures: VentureProject[]): FounderCalendarSection {
  if (ventures.length === 0) {
    return {
      dateLabel: formatDateLabel(),
      items: [
        {
          id: "cal-first",
          timeLabel: "09:00",
          title: "Definir primera empresa",
          description: "Captura una idea y completa Discovery para abrir el portfolio.",
          priority: "alta",
          href: "/",
        },
      ],
    };
  }

  const items: FounderCalendarSection["items"] = [];
  const upcoming = buildUpcomingActions(ventures).slice(0, 3);
  const nextActions = resolveAllNextActions(ventures).slice(0, 4);

  items.push({
    id: "cal-briefing",
    timeLabel: SLOT_LABELS[0],
    title: "Revisión ejecutiva del portfolio",
    description: "Sincronizar prioridades, riesgos y próximas decisiones.",
    priority: "alta",
    href: "/founder",
  });

  upcoming.forEach((action, index) => {
    items.push({
      id: `cal-upcoming-${action.id}`,
      timeLabel: SLOT_LABELS[index + 1] ?? "—",
      title: action.label,
      description: `${action.impact} · ${getEstimatedTimeForAction(action.label)}`,
      priority: action.priority,
      href: action.href,
      ventureName: action.ventureName,
    });
  });

  const usedIds = new Set(items.map((i) => i.id));
  for (const action of nextActions) {
    const id = `cal-next-${action.ventureId}`;
    if (usedIds.has(id) || items.length >= 6) continue;
    usedIds.add(id);
    items.push({
      id,
      timeLabel: SLOT_LABELS[items.length] ?? "—",
      title: action.label,
      description: action.description,
      priority: action.priority,
      href: action.href,
      ventureName: shortName(action.ventureName),
    });
  }

  for (const venture of ventures) {
    if (items.length >= 6) break;
    const remaining = venture.discoveryContext?.remainingQuestions?.length ?? 0;
    if (remaining === 0) continue;
    const id = `cal-discovery-${venture.id}`;
    if (usedIds.has(id)) continue;
    usedIds.add(id);
    items.push({
      id,
      timeLabel: SLOT_LABELS[items.length] ?? "—",
      title: `Resolver Discovery (${remaining})`,
      description: `Preguntas pendientes en ${shortName(venture.name)} que pueden cambiar el rumbo.`,
      priority: "alta",
      href: `/intelligence/${venture.id}`,
      ventureName: shortName(venture.name),
    });
  }

  return {
    dateLabel: formatDateLabel(),
    items: items.slice(0, 6),
  };
}
