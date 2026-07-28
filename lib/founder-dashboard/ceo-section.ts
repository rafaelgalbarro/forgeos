import type { VentureProject } from "@/lib/domain/venture";
import { buildCEOBriefing } from "@/lib/portfolio/ceo-briefing";
import { resolvePortfolioNextAction } from "@/lib/portfolio/next-action";
import type { FounderCeoSection } from "./types";

function buildOpportunity(ventures: VentureProject[]): string {
  if (ventures.length === 0) {
    return "Tu primera empresa puede validarse en semanas con un MVP acotado.";
  }

  const withAdvisor = ventures.find((v) => v.founderAdvisor?.opportunities?.length);
  if (withAdvisor?.founderAdvisor?.opportunities?.[0]) {
    const top = withAdvisor.founderAdvisor.opportunities[0];
    return top.title + (top.description ? ` — ${top.description}` : "");
  }

  const ready = ventures.find((v) => v.status === "ready");
  if (ready) {
    return `${ready.name} está lista para conversaciones con early adopters o inversores ángel.`;
  }

  const building = ventures.find((v) => v.status === "building");
  if (building) {
    return "Cada entrega de producto acerca el lanzamiento y la validación con usuarios reales.";
  }

  return "Concentrar foco en una decisión clave hoy multiplica la velocidad del portfolio.";
}

export function buildFounderCeoSection(ventures: VentureProject[]): FounderCeoSection {
  const briefing = buildCEOBriefing(ventures);
  const portfolioAction = resolvePortfolioNextAction(ventures);
  const opportunity = buildOpportunity(ventures);

  const summary =
    ventures.length === 0
      ? "Aún no hay empresas en tu portfolio. Empieza capturando una idea y completando Discovery."
      : `${briefing.openingLine} ${briefing.observation}`;

  return {
    greeting: briefing.greeting,
    summary,
    observation: briefing.observation,
    criticalRisk: briefing.criticalRisk,
    recommendation: briefing.recommendation,
    expectedImpact: briefing.expectedImpact,
    opportunity,
    ctaLabel: portfolioAction ? "Ir a la acción prioritaria" : briefing.ctaLabel,
    ctaHref: portfolioAction?.href ?? briefing.ctaHref,
    hasEnoughData: briefing.hasEnoughData,
  };
}
