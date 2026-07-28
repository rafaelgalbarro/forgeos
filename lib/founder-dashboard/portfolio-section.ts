import type { VentureProject } from "@/lib/domain/venture";
import { buildPortfolioMetrics } from "@/lib/portfolio/portfolio-metrics";
import type { FounderPortfolioSection } from "./types";

export function buildFounderPortfolioSection(ventures: VentureProject[]): FounderPortfolioSection {
  const metrics = buildPortfolioMetrics(ventures);

  let summary = "Tu portfolio está tomando forma. Revisa métricas y prioriza la empresa con mayor impacto.";
  if (ventures.length === 0) {
    summary = "Sin empresas activas todavía. Las métricas se activarán cuando captures tu primera idea.";
  } else if (ventures.length === 1) {
    summary = "Una empresa en foco — ideal para avanzar con claridad antes de abrir nuevas líneas.";
  } else {
    const active = ventures.filter(
      (v) => v.status === "building" || v.status === "ready" || v.status === "intelligence"
    ).length;
    if (active >= 2) {
      summary = `${active} empresas activas. Equilibra foco ejecutivo con las prioridades del día.`;
    }
  }

  return { metrics, summary };
}
