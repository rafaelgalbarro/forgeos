import type { VentureProject } from "@/lib/domain/venture";
import { resolvePortfolioNextAction } from "@/lib/portfolio/next-action";

export interface PriorityResolution {
  ventureId: string | null;
  ventureName: string | null;
  actionLabel: string | null;
  impact: string | null;
  href: string | null;
  priority: "alta" | "media" | "baja" | null;
}

export function resolveTopPriority(ventures: VentureProject[]): PriorityResolution {
  const next = resolvePortfolioNextAction(ventures);
  if (!next) {
    return {
      ventureId: null,
      ventureName: null,
      actionLabel: "Crear primera empresa",
      impact: "Desbloquea todo el pipeline de ForgeOS",
      href: "/",
      priority: "alta",
    };
  }
  return {
    ventureId: next.ventureId,
    ventureName: next.ventureName,
    actionLabel: next.label,
    impact: next.impact,
    href: next.href,
    priority: next.priority,
  };
}

export function rankVenturesByPriority(ventures: VentureProject[]): VentureProject[] {
  const priorityWeight = (v: VentureProject): number => {
    const remaining = v.discoveryContext?.remainingQuestions?.length ?? 0;
    if (remaining > 0) return 100;
    if (!v.researchReport) return 80;
    if (v.status === "building") return 70;
    if (!v.productPRD) return 60;
    return 40;
  };

  return [...ventures].sort((a, b) => priorityWeight(b) - priorityWeight(a));
}
