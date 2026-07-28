import type { VentureProject } from "@/lib/domain/venture";
import { getEstimatedTimeForAction } from "@/lib/portfolio/impact-engine";
import { resolveAllNextActions } from "@/lib/portfolio/next-action";
import type { FounderPrioritiesSection } from "./types";

export function buildFounderPrioritiesSection(ventures: VentureProject[]): FounderPrioritiesSection {
  if (ventures.length === 0) {
    return {
      headline: "Define tu primera prioridad",
      items: [
        {
          id: "priority-create",
          label: "Capturar primera idea",
          rationale: "Sin una empresa en el portfolio no hay decisiones que priorizar.",
          priority: "alta",
          href: "/",
          estimatedTime: "5 min",
        },
        {
          id: "priority-discovery",
          label: "Completar Discovery inicial",
          rationale: "Estructura el contexto antes de validar mercado o producto.",
          priority: "media",
          href: "/",
          estimatedTime: "10–15 min",
        },
      ],
    };
  }

  const items = resolveAllNextActions(ventures)
    .slice(0, 5)
    .map((action) => ({
      id: `${action.ventureId}-${action.label}`,
      label: action.label,
      rationale: action.description || action.impact,
      ventureName: action.ventureName,
      priority: action.priority,
      href: action.href,
      estimatedTime: getEstimatedTimeForAction(action.label),
    }));

  const altaCount = items.filter((i) => i.priority === "alta").length;
  const headline =
    altaCount > 0
      ? `${altaCount} decisión${altaCount > 1 ? "es" : ""} de alta prioridad hoy`
      : "Prioridades del día";

  return { headline, items };
}
