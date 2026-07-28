import type { VentureProject } from "@/lib/domain/venture";
import { countPriorityActions, resolvePortfolioNextAction } from "@/lib/portfolio/next-action";
import type { FosSnapshot } from "@/lib/fos";

export interface CeoExecutiveSummary {
  portfolioSize: number;
  activeVentures: number;
  topPriority: string;
  ceoMessage: string;
  impactScore: number;
  confidence: number;
  risk: number;
}

export function buildCeoExecutiveSummary(
  ventures: VentureProject[],
  fos: FosSnapshot
): CeoExecutiveSummary {
  const next = resolvePortfolioNextAction(ventures);
  const active = ventures.filter(
    (v) => v.status === "intelligence" || v.status === "building" || v.status === "ready"
  ).length;

  return {
    portfolioSize: ventures.length,
    activeVentures: active,
    topPriority: next?.label ?? "Crear primera empresa",
    ceoMessage:
      ventures.length === 0
        ? "Tu venture studio está listo. El primer paso es capturar una idea."
        : `Tu equipo sigue trabajando. ${countPriorityActions(ventures)} decisión${countPriorityActions(ventures) > 1 ? "es" : ""} pueden acelerar el portfolio.`,
    impactScore: fos.metrics.impactScore,
    confidence: fos.metrics.confidence,
    risk: fos.metrics.risk,
  };
}
