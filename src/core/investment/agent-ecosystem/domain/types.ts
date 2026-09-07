import type {
  AnalysisMarketDesk,
  InvestmentAgent,
  InvestmentAgentResult,
  InvestmentAnalysisContext,
  InvestmentCommitteeDecision,
} from "../../domain/types";

export type AgentSpecialty =
  | "technical"
  | "fundamental"
  | "quant"
  | "macro"
  | "sentiment"
  | "news"
  | "earnings"
  | "institutional-flows"
  | "volatility"
  | "correlations"
  | "liquidity"
  | "risk"
  | "portfolio-manager"
  | "execution-supervisor";

export type AgentMarket = AnalysisMarketDesk;

export type AgentCategory = "specialty" | "market";

export interface AgentDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly category: AgentCategory;
  readonly specialty?: AgentSpecialty;
  readonly market?: AgentMarket;
  /** Soft-disabled markets (e.g. crypto) stay registered but skipped unless capability allows. */
  readonly softDisabled?: boolean;
  readonly description: string;
}

/**
 * Structured conclusion emitted by every agent in the continuous ecosystem.
 * Feeds Investment Committee — never an order path.
 */
export interface AgentConclusion {
  readonly agentId: string;
  readonly agentName: string;
  readonly category: AgentCategory;
  readonly specialty?: AgentSpecialty;
  readonly market?: AgentMarket;
  readonly symbol: string;
  readonly asOf: string;
  readonly score: InvestmentAgentResult["score"];
  readonly confidence: number;
  readonly stance: "BUY" | "SELL" | "HOLD";
  readonly summary: string;
  readonly risks: readonly string[];
  readonly evidence: readonly string[];
  readonly sources: readonly string[];
  readonly timeHorizon: "intraday" | "swing" | "position" | "strategic" | "unknown";
  readonly dataQuality: "live" | "delayed" | "synthetic" | "missing";
}

export interface AgentEcosystemCapabilities {
  readonly cryptoAllowed: boolean;
  readonly optionsAllowed: boolean;
  readonly futuresAllowed: boolean;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly autonomousLive: "LOCKED";
}

export interface AgentRunner {
  readonly definition: AgentDefinition;
  readonly agent: InvestmentAgent;
  run(context: InvestmentAnalysisContext): Promise<AgentConclusion> | AgentConclusion;
}

export interface AgentEcosystemRunResult {
  readonly asOf: string;
  readonly symbol: string;
  readonly marketDesk: AgentMarket | "multi";
  readonly conclusions: readonly AgentConclusion[];
  readonly committee: InvestmentCommitteeDecision;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly autonomousLive: "LOCKED";
}

export const DEFAULT_AGENT_CAPABILITIES: AgentEcosystemCapabilities = {
  cryptoAllowed: false,
  optionsAllowed: true,
  futuresAllowed: true,
  mode: "ANALYSIS_ONLY",
  orderExecution: "disabled",
  liveTradingEnabled: false,
  autonomousLive: "LOCKED",
};

export const AGENT_MARKETS: readonly AgentMarket[] = [
  "usa-equities",
  "europe-equities",
  "asia-equities",
  "forex",
  "etf",
  "indices",
  "futures",
  "options",
  "bonds",
  "commodities",
  "crypto",
] as const;

export const AGENT_SPECIALTIES: readonly AgentSpecialty[] = [
  "technical",
  "fundamental",
  "quant",
  "macro",
  "sentiment",
  "news",
  "earnings",
  "institutional-flows",
  "volatility",
  "correlations",
  "liquidity",
  "risk",
  "portfolio-manager",
  "execution-supervisor",
] as const;
