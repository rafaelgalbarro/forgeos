import type { InvestmentAgent, InvestmentAnalysisContext } from "../../domain/types";
import { createResult } from "../../application/agents/base";
import type { AgentDefinition, AgentMarket, AgentRunner } from "../domain/types";
import { toAgentConclusion } from "./conclusion";

function deskBias(context: InvestmentAnalysisContext, desk: AgentMarket): number {
  const trend = context.market.trend;
  const volAdj = context.market.volatility > 0.4 ? -0.15 : 0;
  const match = context.marketDesk === desk ? 0.15 : 0;
  const base = (trend + match + volAdj) * 0.8;
  // Soft-disable crypto: still emit conclusion but near-neutral with low confidence path via signal magnitude
  if (desk === "crypto" && context.marketDesk !== "crypto") {
    return 0;
  }
  return Math.max(-1, Math.min(1, base));
}

function marketAgent(desk: AgentMarket, label: string, softDisabled = false): {
  definition: AgentDefinition;
  agent: InvestmentAgent;
} {
  const definition: AgentDefinition = {
    id: `market-${desk}`,
    displayName: `${label} Desk`,
    category: "market",
    market: desk,
    softDisabled,
    description: `Market-scoped analysis for ${label}.`,
  };
  const agent: InvestmentAgent = {
    analyze(context: InvestmentAnalysisContext) {
      const signal = deskBias(context, desk);
      return createResult(
        definition.displayName,
        signal,
        softDisabled && context.marketDesk !== desk
          ? `${label} desk soft-disabled / capability-gated — ANALYSIS_ONLY stub.`
          : `Assesses ${label} microstructure, session, and regional risk premium.`,
        [`${desk}-session`, `${desk}-liquidity-proxy`, "market-intelligence"],
      );
    },
  };
  return { definition, agent };
}

const MARKET_SPECS = [
  marketAgent("usa-equities", "USA Equities"),
  marketAgent("europe-equities", "Europe Equities"),
  marketAgent("asia-equities", "Asia Equities"),
  marketAgent("forex", "Forex"),
  marketAgent("etf", "ETF"),
  marketAgent("indices", "Indices"),
  marketAgent("futures", "Futures"),
  marketAgent("options", "Options"),
  marketAgent("bonds", "Bonds"),
  marketAgent("commodities", "Commodities"),
  marketAgent("crypto", "Crypto", true),
] as const;

export function createMarketAgentRunners(options?: {
  cryptoAllowed?: boolean;
}): AgentRunner[] {
  const cryptoAllowed = options?.cryptoAllowed ?? false;
  return MARKET_SPECS.filter((spec) => {
    if (spec.definition.market === "crypto" && !cryptoAllowed) {
      // Keep registered but include as soft-disabled runner that emits stub conclusions
      return true;
    }
    return true;
  }).map((spec) => ({
    definition: {
      ...spec.definition,
      softDisabled: spec.definition.market === "crypto" ? !cryptoAllowed : spec.definition.softDisabled,
    },
    agent: spec.agent,
    run(context: InvestmentAnalysisContext) {
      const result = spec.agent.analyze(context) as ReturnType<typeof createResult>;
      const soft =
        spec.definition.market === "crypto" && !cryptoAllowed
          ? {
              risks: ["crypto capability disabled", "regulatory soft-gate"] as const,
              dataQuality: "missing" as const,
            }
          : {
              risks: [`${spec.definition.displayName} regional gap risk`] as const,
            };
      return toAgentConclusion(spec.definition, result, context, soft);
    },
  }));
}
