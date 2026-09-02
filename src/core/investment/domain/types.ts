export type InvestmentStance = "BUY" | "SELL" | "HOLD";

/** Full committee action set (extends stance with REDUCE / EXIT). */
export type CommitteeAction = "BUY" | "SELL" | "HOLD" | "REDUCE" | "EXIT";

export type InvestmentTimeHorizon =
  | "intraday"
  | "swing"
  | "position"
  | "strategic"
  | "unknown";

export interface InvestmentScore {
  buy: number;
  sell: number;
  hold: number;
}

export interface InvestmentAgentResult {
  agent: string;
  score: InvestmentScore;
  confidence: number;
  reasoning: string;
  sources: string[];
}

export interface InvestmentAnalysisContext {
  asOf: string;
  symbol: string;
  market: {
    price: number;
    volatility: number;
    trend: number;
  };
  signals: {
    macro: number;
    fundamental: number;
    technical: number;
    quant: number;
    news: number;
    risk: number;
    portfolioFit: number;
    /** Optional extended specialty signals (stub gracefully when missing). */
    sentiment?: number;
    earnings?: number;
    institutionalFlows?: number;
    volatilitySpecialty?: number;
    correlations?: number;
    liquidity?: number;
    execution?: number;
  };
  notes?: string[];
  subordinateResults?: InvestmentAgentResult[];
  /** Optional market-desk context for market-scoped agents. */
  marketDesk?: AnalysisMarketDesk;
}

export type AnalysisMarketDesk =
  | "usa-equities"
  | "europe-equities"
  | "asia-equities"
  | "forex"
  | "etf"
  | "indices"
  | "futures"
  | "options"
  | "bonds"
  | "commodities"
  | "crypto";

export interface InvestmentAgent {
  analyze(context: InvestmentAnalysisContext): Promise<InvestmentAgentResult> | InvestmentAgentResult;
}

export interface MinorityView {
  agent: string;
  stance: InvestmentStance;
  reasoning: string;
}

/**
 * Investment Committee decision.
 * Backward-compatible core scores + required enrichment metadata.
 */
export interface InvestmentCommitteeDecision {
  buy_score: number;
  sell_score: number;
  hold_score: number;
  confidence: number;
  dissent: number;
  consensus: InvestmentStance;
  minority_report: MinorityView[];
  /** Full action including REDUCE / EXIT. */
  action: CommitteeAction;
  explanation: string;
  risks: readonly string[];
  timeHorizon: InvestmentTimeHorizon;
  sourcesUsed: readonly string[];
  evidence: readonly string[];
  expectedPortfolioImpact: string;
}
