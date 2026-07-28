/** CEO Office ↔ Executive Intelligence Runtime bridge (Epic 3.2). */

import type { VentureProject } from "@/lib/domain/venture";
import { buildCEOBriefing } from "@/lib/portfolio/ceo-briefing";
import type { CEOBriefing } from "@/lib/portfolio/types";
import type { CeoOutput } from "@/lib/ai-orchestration/types";
import { runExecutiveIntelligence } from "@/lib/ceo-office/executive-runtime";
import type { PortfolioHighlights } from "@/lib/ceo-office/portfolio-ranking";

export type CeoBriefingSource = "ai" | "heuristic" | "mock";

export interface CeoOfficeBriefingContext {
  ventures: VentureProject[];
}

export interface CeoOfficeBriefing extends CEOBriefing {
  source: CeoBriefingSource;
  provider?: string;
  model?: string;
  fallbackUsed: boolean;
  warnings: string[];
  generatedAt: string;
  executiveSummary?: string;
  topPriorities?: string[];
  growthOpportunities?: string[];
  blockedVentures?: string[];
  recommendedNextActions?: string[];
  confidence?: number;
  timeHorizon?: string;
  consensusLevel?: string;
  consensusDecision?: string;
  portfolioHighlights?: PortfolioHighlights;
}

function heuristicBriefing(context: CeoOfficeBriefingContext): CeoOfficeBriefing {
  const base = buildCEOBriefing(context.ventures);
  return {
    ...base,
    source: "heuristic",
    fallbackUsed: false,
    warnings: [],
    generatedAt: new Date().toISOString(),
  };
}

function mapAiToBriefing(
  heuristic: CEOBriefing,
  output: CeoOutput,
  runtime: Awaited<ReturnType<typeof runExecutiveIntelligence>>,
  meta: {
    source: CeoBriefingSource;
    provider?: string;
    model?: string;
    fallbackUsed: boolean;
    warnings: string[];
  }
): CeoOfficeBriefing {
  const risks = output.criticalRisks ?? output.risks;
  const priorities = output.topPriorities ?? [output.priority];

  return {
    ...heuristic,
    observation: (output.executiveSummary ?? output.summary) || heuristic.observation,
    criticalRisk: risks.length > 0 ? risks.join(" · ") : heuristic.criticalRisk,
    recommendation:
      output.recommendedNextActions?.[0] ?? (output.recommendation || heuristic.recommendation),
    expectedImpact: output.expectedImpact || heuristic.expectedImpact,
    executiveSummary: output.executiveSummary ?? output.summary,
    topPriorities: priorities,
    growthOpportunities: output.growthOpportunities,
    blockedVentures: output.blockedVentures,
    recommendedNextActions: output.recommendedNextActions ?? [output.recommendation],
    confidence: output.confidence,
    timeHorizon: output.timeHorizon,
    consensusLevel: runtime.consensus?.level,
    consensusDecision: runtime.consensus?.finalDecision,
    portfolioHighlights: runtime.portfolioHighlights,
    source: meta.source,
    provider: meta.provider,
    model: meta.model,
    fallbackUsed: meta.fallbackUsed,
    warnings: meta.warnings,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Resolves CEO briefing via Executive Runtime with heuristic fallback.
 * Safe without API keys — never throws to callers.
 */
export async function getCeoOfficeBriefing(
  context: CeoOfficeBriefingContext
): Promise<CeoOfficeBriefing> {
  const heuristic = heuristicBriefing(context);

  if (context.ventures.length === 0) {
    return heuristic;
  }

  try {
    const runtime = await runExecutiveIntelligence(context.ventures);

    if (runtime.ceo && runtime.source === "ai") {
      return mapAiToBriefing(heuristic, runtime.ceo, runtime, {
        source: "ai",
        provider: runtime.provider,
        model: runtime.model,
        fallbackUsed: false,
        warnings: runtime.warnings,
      });
    }

    if (runtime.ceo && runtime.source === "mock") {
      return mapAiToBriefing(heuristic, runtime.ceo, runtime, {
        source: "mock",
        provider: runtime.provider,
        model: runtime.model,
        fallbackUsed: true,
        warnings: [...runtime.warnings, "Sin API keys — modo mock."],
      });
    }

    return {
      ...heuristic,
      source: runtime.source === "mock" ? "mock" : "heuristic",
      provider: runtime.provider,
      model: runtime.model,
      fallbackUsed: true,
      warnings: [
        ...runtime.warnings,
        runtime.source === "mock"
          ? "Sin API keys — modo mock."
          : "Fallback activo — briefing heurístico.",
      ],
      consensusLevel: runtime.consensus?.level,
      consensusDecision: runtime.consensus?.finalDecision,
      portfolioHighlights: runtime.portfolioHighlights,
      generatedAt: runtime.generatedAt,
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[CEO Office] Executive runtime failed, using heuristic:", error);
    }
    return {
      ...heuristic,
      fallbackUsed: true,
      warnings: ["Error de IA — briefing heurístico."],
      generatedAt: new Date().toISOString(),
    };
  }
}
