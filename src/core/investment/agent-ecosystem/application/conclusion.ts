import type {
  InvestmentAgentResult,
  InvestmentAnalysisContext,
} from "../../domain/types";
import { stanceFromScore } from "../../application/agents/base";
import type { AgentConclusion, AgentDefinition } from "../domain/types";

export function toAgentConclusion(
  definition: AgentDefinition,
  result: InvestmentAgentResult,
  context: InvestmentAnalysisContext,
  extras?: {
    risks?: readonly string[];
    evidence?: readonly string[];
    timeHorizon?: AgentConclusion["timeHorizon"];
    dataQuality?: AgentConclusion["dataQuality"];
  },
): AgentConclusion {
  return {
    agentId: definition.id,
    agentName: definition.displayName,
    category: definition.category,
    specialty: definition.specialty,
    market: definition.market,
    symbol: context.symbol,
    asOf: context.asOf,
    score: result.score,
    confidence: result.confidence,
    stance: stanceFromScore(result.score),
    summary: result.reasoning,
    risks: extras?.risks ?? [`${definition.displayName} residual model risk`],
    evidence: extras?.evidence ?? result.sources,
    sources: result.sources,
    timeHorizon: extras?.timeHorizon ?? "swing",
    dataQuality: extras?.dataQuality ?? (context.notes?.includes("synthetic") ? "synthetic" : "delayed"),
  };
}
