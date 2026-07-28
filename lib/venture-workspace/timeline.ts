import type { VentureProject } from "@/lib/domain/venture";
import { formatRelativeTime } from "@/lib/portfolio/time-utils";
import type { WorkspaceActivityItem, WorkspaceTimelineEvent } from "./types";

function offsetTimestamp(baseIso: string, minutesAgo: number): string {
  const base = new Date(baseIso).getTime();
  return new Date(base - minutesAgo * 60_000).toISOString();
}

export function buildWorkspaceTimeline(venture: VentureProject): WorkspaceTimelineEvent[] {
  const events: WorkspaceTimelineEvent[] = [];
  const base = venture.updatedAt;

  events.push({
    id: "created",
    title: "Venture creado",
    time: venture.createdAt,
    relative: formatRelativeTime(venture.createdAt),
    description: venture.ideaText.slice(0, 120) + (venture.ideaText.length > 120 ? "…" : ""),
  });

  if (venture.intelligenceReport) {
    events.push({
      id: "intelligence",
      title: "Análisis de inteligencia completado",
      time: offsetTimestamp(base, 180),
      relative: formatRelativeTime(offsetTimestamp(base, 180)),
      description: `Startup Score inicial: ${venture.intelligenceReport.startupScore ?? "—"}`,
    });
  }

  if (venture.discoveryContext?.answers.length) {
    events.push({
      id: "discovery",
      title: "Discovery actualizado",
      time: offsetTimestamp(base, 120),
      relative: formatRelativeTime(offsetTimestamp(base, 120)),
      description: `${venture.discoveryContext.answers.length} respuestas registradas`,
    });
  }

  if (venture.ventureSimulatorResult) {
    events.push({
      id: "simulator",
      title: "Venture Simulator ejecutado",
      time: offsetTimestamp(base, 90),
      relative: formatRelativeTime(offsetTimestamp(base, 90)),
      description: `Recomendación: ${venture.ventureSimulatorResult.recommendation}`,
    });
  }

  if (venture.researchReport) {
    events.push({
      id: "research",
      title: "Research completado",
      time: offsetTimestamp(base, 60),
      relative: formatRelativeTime(offsetTimestamp(base, 60)),
    });
  }

  if (venture.productPRD) {
    events.push({
      id: "product",
      title: "PRD generado",
      time: offsetTimestamp(base, 45),
      relative: formatRelativeTime(offsetTimestamp(base, 45)),
      description: venture.productPRDSource === "ai" ? "Generado con IA" : undefined,
    });
  }

  if (venture.status === "building") {
    events.push({
      id: "build",
      title: "Build iniciado",
      time: offsetTimestamp(base, 30),
      relative: formatRelativeTime(offsetTimestamp(base, 30)),
    });
  }

  if (venture.status === "ready" && venture.sections.length > 0) {
    events.push({
      id: "ready",
      title: "Paquete startup listo",
      time: base,
      relative: formatRelativeTime(base),
      description: `${venture.sections.length} secciones documentadas`,
    });
  }

  return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}

export function buildWorkspaceActivity(venture: VentureProject): WorkspaceActivityItem[] {
  return buildWorkspaceTimeline(venture).map((e) => ({
    id: e.id,
    label: e.title,
    relative: e.relative,
    type: e.id,
  }));
}
