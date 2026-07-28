import type { VentureProject } from "@/lib/domain/venture";
import {
  runVentureSimulator,
  ventureToSimulatorInput,
} from "@/lib/venture-simulator";
import { resolveNextAction } from "@/lib/portfolio/next-action";
import { resolveScores, sectionHasContent } from "@/lib/portfolio/venture-status";
import type { ForgeNotification, NotificationCenterSnapshot } from "./types";

export function buildNotificationCenter(ventures: VentureProject[]): NotificationCenterSnapshot {
  const notifications: ForgeNotification[] = [];
  const now = new Date().toISOString();

  for (const v of ventures) {
    const next = resolveNextAction(v);

    if (v.researchReport) {
      notifications.push({
        id: `${v.id}-research-done`,
        type: "research_done",
        title: "Research finalizado",
        body: `${v.name} tiene análisis de mercado listo.`,
        ventureId: v.id,
        ventureName: v.name,
        priority: "medium",
        href: v.status === "ready" ? `/venture/${v.id}` : `/intelligence/${v.id}`,
        timestamp: v.updatedAt,
        read: false,
      });
    }

    const remaining = v.discoveryContext?.remainingQuestions?.length ?? 0;
    if (remaining > 0) {
      notifications.push({
        id: `${v.id}-discovery`,
        type: "discovery",
        title: "Decisión pendiente",
        body: `${remaining} pregunta${remaining > 1 ? "s" : ""} de Discovery en ${v.name}.`,
        ventureId: v.id,
        ventureName: v.name,
        priority: "high",
        href: `/intelligence/${v.id}`,
        timestamp: now,
        read: false,
      });
    }

    if (v.researchReport) {
      notifications.push({
        id: `${v.id}-competitor`,
        type: "competitor",
        title: "Competidor detectado",
        body: `Marketing encontró señales de competencia en ${v.name}.`,
        ventureId: v.id,
        ventureName: v.name,
        priority: "medium",
        href: next.href,
        timestamp: now,
        read: false,
      });
    }

    const scores = resolveScores(v);
    const sim =
      v.ventureSimulatorResult ?? runVentureSimulator(ventureToSimulatorInput(v));
    if (
      (scores.ventureScore !== null && scores.ventureScore < 45) ||
      sim?.recommendation === "pivot"
    ) {
      notifications.push({
        id: `${v.id}-risk`,
        type: "risk",
        title: "Nuevo riesgo",
        body: `${v.name} requiere revisión estratégica.`,
        ventureId: v.id,
        ventureName: v.name,
        priority: "high",
        href: `/intelligence/${v.id}`,
        timestamp: now,
        read: false,
      });
    }

    if (v.productPRD && v.status === "ready" && !sectionHasContent(v, "frontend")) {
      notifications.push({
        id: `${v.id}-build`,
        type: "build_ready",
        title: "Startup lista para Build",
        body: `${v.name} tiene PRD y Build Plan listos para revisar.`,
        ventureId: v.id,
        ventureName: v.name,
        priority: "high",
        href: `/venture/${v.id}`,
        timestamp: now,
        read: false,
      });
    }

    if (v.ventureSimulatorResult) {
      notifications.push({
        id: `${v.id}-sim`,
        type: "simulator",
        title: "Venture Score actualizado",
        body: `Simulator recalculó métricas de ${v.name}.`,
        ventureId: v.id,
        ventureName: v.name,
        priority: "low",
        href: `/intelligence/${v.id}`,
        timestamp: v.updatedAt,
        read: true,
      });
    }
  }

  if (ventures.length > 0) {
    notifications.push({
      id: "ceo-briefing",
      type: "ceo",
      title: "Briefing del CEO",
      body: "CEO AI preparó recomendaciones para tu portfolio.",
      priority: "medium",
      href: "/dashboard#dashboard-ceo",
      timestamp: now,
      read: false,
    });
  }

  const sorted = notifications.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return {
    notifications: sorted.slice(0, 12),
    unreadCount: sorted.filter((n) => !n.read).length,
  };
}
