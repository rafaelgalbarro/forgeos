import type { VentureProject } from "@/lib/domain/venture";
import { buildRecentActivity } from "@/lib/portfolio/activity-feed";
import { buildUpcomingActions } from "@/lib/portfolio/activity-feed";
import type { FounderActivitySection } from "./types";

const CATEGORY_LABELS: Record<string, string> = {
  ceo: "Resumen ejecutivo",
  discovery: "Discovery",
  simulator: "Valoración",
  build_plan: "Plan de producto",
  export: "Documentación",
  research: "Mercado",
  product: "Producto",
  venture: "Empresa",
};

const FOUNDER_LABELS: Record<string, string> = {
  "CEO AI revisó tu portfolio": "Resumen ejecutivo actualizado",
  "Venture Simulator recalculado": "Valoración del venture actualizada",
  "Build Plan listo para revisar": "Plan de producto listo para revisar",
  "Investor Pack exportado": "Paquete para inversores exportado",
};

function founderLabel(original: string): string {
  return FOUNDER_LABELS[original] ?? original;
}

export function buildFounderActivitySection(ventures: VentureProject[]): FounderActivitySection {
  const recent = buildRecentActivity(ventures);
  const upcoming = buildUpcomingActions(ventures);

  const items = recent.map((event) => ({
    id: event.id,
    label: founderLabel(event.label),
    ventureName: event.ventureName,
    category: CATEGORY_LABELS[event.type] ?? "Actividad",
    relative: event.relative,
    href: event.ventureId
      ? event.type === "build_plan" || event.type === "export"
        ? `/venture/${event.ventureId}`
        : `/intelligence/${event.ventureId}`
      : undefined,
  }));

  return {
    items: items.slice(0, 8),
    upcomingCount: upcoming.length,
  };
}
