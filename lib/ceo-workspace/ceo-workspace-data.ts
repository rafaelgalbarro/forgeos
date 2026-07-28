import type { VentureProject } from "@/lib/domain/venture";
import { getCeoOfficeBriefing, type CeoOfficeBriefing } from "@/lib/ceo-office/ceo-ai-bridge";
import { buildCEOBriefing } from "@/lib/portfolio/ceo-briefing";
import { resolveAllNextActions, resolvePortfolioNextAction } from "@/lib/portfolio/next-action";
import { buildCeoDirectorNarrative } from "./ceo-narrative";
import { buildDailyAgenda } from "./daily-agenda";
import { buildPortfolioSnapshot } from "./portfolio-snapshot";
import type {
  CeoWorkspaceData,
  NextDecisionItem,
  OpportunityItem,
  PriorityItem,
  RecommendationItem,
  RiskItem,
} from "./types";

function focusVenture(ventures: VentureProject[]): VentureProject | null {
  if (ventures.length === 0) return null;
  return [...ventures].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )[0];
}

function mapPriorities(briefing: CeoOfficeBriefing, ventures: VentureProject[]): PriorityItem[] {
  const fromAi = briefing.topPriorities ?? [];
  if (fromAi.length > 0) {
    const focus = focusVenture(ventures);
    return fromAi.map((label, index) => ({
      id: `priority-ai-${index}`,
      label,
      rationale: index === 0 ? briefing.observation : briefing.expectedImpact,
      ventureName: focus?.name,
      href: briefing.ctaHref,
    }));
  }

  return resolveAllNextActions(ventures)
    .slice(0, 5)
    .map((action) => ({
      id: `priority-${action.ventureId}`,
      label: action.label,
      rationale: action.description,
      ventureName: action.ventureName,
      href: action.href,
    }));
}

function mapRisks(briefing: CeoOfficeBriefing, ventures: VentureProject[]): RiskItem[] {
  const risks: RiskItem[] = [];
  const critical = briefing.criticalRisk;
  if (critical) {
    const focus = focusVenture(ventures);
    risks.push({
      id: "risk-critical",
      label: critical,
      severity: "critical",
      ventureName: focus?.name,
    });
  }

  for (const venture of ventures) {
    const sim = venture.ventureSimulatorResult;
    if (sim?.recommendation === "pivot") {
      risks.push({
        id: `risk-pivot-${venture.id}`,
        label: "El Venture Simulator sugiere pivot estratégico",
        severity: "high",
        ventureName: venture.name,
      });
    }
    const remaining = venture.discoveryContext?.remainingQuestions?.length ?? 0;
    if (remaining > 0) {
      risks.push({
        id: `risk-discovery-${venture.id}`,
        label: `${remaining} decisión${remaining > 1 ? "es" : ""} de Discovery sin resolver`,
        severity: "medium",
        ventureName: venture.name,
      });
    }
  }

  const blocked = briefing.blockedVentures ?? [];
  blocked.forEach((name, index) => {
    risks.push({
      id: `risk-blocked-${index}`,
      label: `Venture bloqueada: ${name}`,
      severity: "high",
      ventureName: name,
    });
  });

  return risks.slice(0, 6);
}

function mapOpportunities(briefing: CeoOfficeBriefing, ventures: VentureProject[]): OpportunityItem[] {
  const fromAi = briefing.growthOpportunities ?? [];
  if (fromAi.length > 0) {
    return fromAi.map((label, index) => ({
      id: `opp-ai-${index}`,
      label,
      impact: briefing.expectedImpact,
    }));
  }

  const items: OpportunityItem[] = [];
  const portfolio = buildPortfolioSnapshot(ventures);

  if (portfolio.promisingVenture) {
    items.push({
      id: "opp-promising",
      label: `${portfolio.promisingVenture.name} muestra el mayor potencial de ROI`,
      impact: "Concentrar recursos aquí puede acelerar validación de mercado.",
    });
  }

  for (const venture of ventures) {
    if (venture.productPRD && venture.status !== "building") {
      items.push({
        id: `opp-build-${venture.id}`,
        label: `PRD listo en ${venture.name} — ventana para iniciar Build`,
        impact: "Reduce tiempo hasta MVP y validación con usuarios.",
      });
    }
  }

  if (items.length === 0 && ventures.length > 0) {
    items.push({
      id: "opp-default",
      label: "Consolidar foco en el venture más activo del portfolio",
      impact: briefing.expectedImpact,
    });
  }

  return items.slice(0, 5);
}

function mapRecommendations(briefing: CeoOfficeBriefing): RecommendationItem[] {
  const actions = briefing.recommendedNextActions ?? [briefing.recommendation];
  return actions.filter(Boolean).map((action, index) => ({
    id: `rec-${index}`,
    action,
    rationale: briefing.observation,
    expectedImpact: briefing.expectedImpact,
    href: briefing.ctaHref,
  }));
}

function mapNextDecisions(briefing: CeoOfficeBriefing, ventures: VentureProject[]): NextDecisionItem[] {
  const items: NextDecisionItem[] = [];

  if (briefing.consensusDecision) {
    items.push({
      id: "decision-consensus",
      decision: briefing.consensusDecision,
      context: briefing.consensusLevel
        ? `Nivel de consenso del board: ${briefing.consensusLevel}`
        : "Decisión del board ejecutivo",
      priority: "alta",
      href: briefing.ctaHref,
    });
  }

  for (const venture of ventures) {
    const remaining = venture.discoveryContext?.remainingQuestions ?? [];
    for (const [index, question] of remaining.slice(0, 2).entries()) {
      const text = typeof question === "string" ? question : "Resolver pregunta de Discovery";
      items.push({
        id: `decision-${venture.id}-${index}`,
        decision: text,
        context: `Afecta el rumbo de ${venture.name}`,
        ventureName: venture.name,
        href: `/intelligence/${venture.id}`,
        priority: "alta",
      });
    }
  }

  const portfolioAction = resolvePortfolioNextAction(ventures);
  if (portfolioAction) {
    items.push({
      id: `decision-next-${portfolioAction.ventureId}`,
      decision: portfolioAction.label,
      context: portfolioAction.description,
      ventureName: portfolioAction.ventureName,
      href: portfolioAction.href,
      priority: portfolioAction.priority,
    });
  }

  if (items.length === 0) {
    items.push({
      id: "decision-empty",
      decision: briefing.recommendation || "Definir primera startup",
      context: briefing.observation,
      href: briefing.ctaHref,
      priority: "alta",
    });
  }

  return items.slice(0, 6);
}

function assembleFromBriefing(
  ventures: VentureProject[],
  briefing: CeoOfficeBriefing
): CeoWorkspaceData {
  const focus = focusVenture(ventures);
  const portfolio = buildPortfolioSnapshot(ventures);
  const priorities = mapPriorities(briefing, ventures);
  const narrative = buildCeoDirectorNarrative(
    ventures,
    briefing,
    priorities,
    focus?.name ?? null
  );

  return {
    source: briefing.source,
    generatedAt: briefing.generatedAt,
    focusVentureId: focus?.id ?? null,
    focusVentureName: focus?.name ?? null,
    provider: briefing.provider,
    model: briefing.model,
    fallbackUsed: briefing.fallbackUsed,
    warnings: briefing.warnings,
    narrative,
    executiveBrief:
      briefing.executiveSummary ?? briefing.observation ?? briefing.openingLine,
    priorities,
    risks: mapRisks(briefing, ventures),
    opportunities: mapOpportunities(briefing, ventures),
    recommendations: mapRecommendations(briefing),
    nextDecisions: mapNextDecisions(briefing, ventures),
    portfolio,
    agenda: buildDailyAgenda(ventures),
    consensusLevel: briefing.consensusLevel,
    consensusDecision: briefing.consensusDecision,
    confidence: briefing.confidence,
    timeHorizon: briefing.timeHorizon,
  };
}

/**
 * Assembles CEO Workspace from Executive Runtime (via ceo-ai-bridge) + portfolio heuristics.
 * Safe without API keys — falls back to buildCEOBriefing.
 */
export async function buildCeoWorkspaceData(
  ventures: VentureProject[]
): Promise<CeoWorkspaceData> {
  const briefing = await getCeoOfficeBriefing({ ventures });
  return assembleFromBriefing(ventures, briefing);
}

/** Synchronous heuristic-only path for client-side instant render or API failure. */
export function buildCeoWorkspaceDataHeuristic(
  ventures: VentureProject[]
): CeoWorkspaceData {
  const base = buildCEOBriefing(ventures);
  const briefing: CeoOfficeBriefing = {
    ...base,
    source: "heuristic",
    fallbackUsed: false,
    warnings: [],
    generatedAt: new Date().toISOString(),
  };
  return assembleFromBriefing(ventures, briefing);
}
