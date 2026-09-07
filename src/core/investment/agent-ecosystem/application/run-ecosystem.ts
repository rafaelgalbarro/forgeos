import { ChiefInvestmentOfficer } from "../../application/agents/chief-investment-officer";
import type { InvestmentAgentResult, InvestmentAnalysisContext } from "../../domain/types";
import type { AgentEcosystemRunResult, AgentMarket } from "../domain/types";
import { AgentEcosystemRegistry, createDefaultAgentEcosystem } from "./registry";

export interface RunAgentEcosystemInput {
  readonly context: InvestmentAnalysisContext;
  readonly registry?: AgentEcosystemRegistry;
  /** When set, include matching market desk + all specialties. */
  readonly marketDesk?: AgentMarket;
  readonly includeSoftDisabled?: boolean;
}

/**
 * Run specialty (+ optional market) agents independently, then feed CIO.
 * Analysis-only — never places orders.
 */
export async function runAgentEcosystem(
  input: RunAgentEcosystemInput,
): Promise<AgentEcosystemRunResult> {
  const registry = input.registry ?? createDefaultAgentEcosystem();
  const context: InvestmentAnalysisContext = {
    ...input.context,
    marketDesk: input.marketDesk ?? input.context.marketDesk,
  };

  const specialty = registry.listRunners({ category: "specialty" });
  const market = registry.listRunners({
    category: "market",
    market: input.marketDesk ?? context.marketDesk,
    includeSoftDisabled: input.includeSoftDisabled ?? false,
  });

  const runners = [...specialty, ...market];
  const conclusions = await Promise.all(runners.map((runner) => Promise.resolve(runner.run(context))));

  const subordinateResults: InvestmentAgentResult[] = conclusions.map((c) => ({
    agent: c.agentName,
    score: c.score,
    confidence: c.confidence,
    reasoning: c.summary,
    sources: [...c.sources],
  }));

  const cio = new ChiefInvestmentOfficer();
  const committee = cio.aggregate(subordinateResults);

  return {
    asOf: context.asOf,
    symbol: context.symbol,
    marketDesk: input.marketDesk ?? context.marketDesk ?? "multi",
    conclusions,
    committee,
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    autonomousLive: "LOCKED",
  };
}
