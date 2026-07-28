import type { VentureProject } from "@/lib/domain/venture";
import { buildUpcomingActions } from "@/lib/portfolio/activity-feed";
import { getEstimatedTimeForAction } from "@/lib/portfolio/impact-engine";
import { resolveAllNextActions } from "@/lib/portfolio/next-action";
import type { AgendaItem } from "./types";

const SLOT_LABELS = ["09:00", "10:30", "12:00", "15:00", "17:00"];

function shortName(name: string): string {
  return name.length > 40 ? `${name.slice(0, 37)}…` : name;
}

export function buildDailyAgenda(ventures: VentureProject[]): AgendaItem[] {
  if (ventures.length === 0) {
    return [
      {
        id: "agenda-first-venture",
        timeLabel: "09:00",
        title: "Definir primera startup",
        description: "Captura una idea y completa Discovery para abrir el portfolio.",
        priority: "alta",
        href: "/",
      },
    ];
  }

  const items: AgendaItem[] = [];
  const upcoming = buildUpcomingActions(ventures).slice(0, 3);
  const nextActions = resolveAllNextActions(ventures).slice(0, 4);

  items.push({
    id: "agenda-briefing",
    timeLabel: SLOT_LABELS[0],
    title: "Revisión ejecutiva del portfolio",
    description: "Sincronizar prioridades, riesgos y próximas decisiones con el Director General.",
    priority: "alta",
    href: "/ceo",
  });

  upcoming.forEach((action, index) => {
    items.push({
      id: `agenda-upcoming-${action.id}`,
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
    const id = `agenda-next-${action.ventureId}`;
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
    const id = `agenda-discovery-${venture.id}`;
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

  return items.slice(0, 6);
}
