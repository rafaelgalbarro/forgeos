import type { InvestmentAgent, InvestmentAnalysisContext } from "../../domain/types";
import {
  FundamentalAnalyst,
  MacroAnalyst,
  NewsAnalyst,
  PortfolioManager,
  QuantAnalyst,
  RiskManager,
  TechnicalAnalyst,
} from "../../application/agents/analysts";
import { createResult } from "../../application/agents/base";
import type { AgentDefinition, AgentRunner } from "../domain/types";
import { toAgentConclusion } from "./conclusion";

function signalOr(context: InvestmentAnalysisContext, key: keyof InvestmentAnalysisContext["signals"], fallback = 0): number {
  const value = context.signals[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

class SentimentAnalyst implements InvestmentAgent {
  analyze(context: InvestmentAnalysisContext) {
    return createResult(
      "Sentiment Analyst",
      signalOr(context, "sentiment", signalOr(context, "news") * 0.7),
      "Scores narrative tone, crowd positioning, and sentiment momentum.",
      ["sentiment-feed", "social-proxy"],
    );
  }
}

class EarningsAnalyst implements InvestmentAgent {
  analyze(context: InvestmentAnalysisContext) {
    return createResult(
      "Earnings Analyst",
      signalOr(context, "earnings", signalOr(context, "fundamental") * 0.6),
      "Evaluates earnings surprises, revisions, and guidance trajectory.",
      ["earnings-calendar", "estimate-revisions"],
    );
  }
}

class InstitutionalFlowsAnalyst implements InvestmentAgent {
  analyze(context: InvestmentAnalysisContext) {
    return createResult(
      "Institutional Flows Analyst",
      signalOr(context, "institutionalFlows", signalOr(context, "quant") * 0.5),
      "Tracks institutional flow pressure and positioning shifts when available.",
      ["flow-proxy", "ownership-changes"],
    );
  }
}

class VolatilityAnalyst implements InvestmentAgent {
  analyze(context: InvestmentAnalysisContext) {
    const volSignal =
      signalOr(context, "volatilitySpecialty") ||
      (context.market.volatility > 0.35 ? -0.4 : context.market.volatility < 0.15 ? 0.2 : 0);
    return createResult(
      "Volatility Analyst",
      volSignal,
      "Assesses realized/implied volatility regime and skew pressure.",
      ["volatility-surface", "realized-vol"],
    );
  }
}

class CorrelationsAnalyst implements InvestmentAgent {
  analyze(context: InvestmentAnalysisContext) {
    return createResult(
      "Correlations Analyst",
      signalOr(context, "correlations", 0),
      "Measures cross-asset correlation regime and diversification stress.",
      ["correlation-matrix", "factor-covariance"],
    );
  }
}

class LiquidityAnalyst implements InvestmentAgent {
  analyze(context: InvestmentAnalysisContext) {
    return createResult(
      "Liquidity Analyst",
      signalOr(context, "liquidity", 0.1),
      "Scores depth, spread quality, and participation capacity.",
      ["order-book-proxy", "volume-profile"],
    );
  }
}

class ExecutionSupervisor implements InvestmentAgent {
  analyze(context: InvestmentAnalysisContext) {
    return createResult(
      "Execution Supervisor",
      signalOr(context, "execution", signalOr(context, "liquidity", 0)),
      "Supervises execution feasibility only — never places orders (ANALYSIS_ONLY).",
      ["execution-quality-model", "spread-impact"],
    );
  }
}

type SpecialtySpec = {
  definition: AgentDefinition;
  agent: InvestmentAgent;
  risks: readonly string[];
  timeHorizon: "intraday" | "swing" | "position" | "strategic" | "unknown";
};

const SPECIALTY_SPECS: readonly SpecialtySpec[] = [
  {
    definition: {
      id: "specialty-technical",
      displayName: "Technical Analyst",
      category: "specialty",
      specialty: "technical",
      description: "Trend, momentum, support/resistance.",
    },
    agent: new TechnicalAnalyst(),
    risks: ["false breakouts", "whipsaw in sideways regimes"],
    timeHorizon: "swing",
  },
  {
    definition: {
      id: "specialty-fundamental",
      displayName: "Fundamental Analyst",
      category: "specialty",
      specialty: "fundamental",
      description: "Valuation, balance sheet, earnings durability.",
    },
    agent: new FundamentalAnalyst(),
    risks: ["accounting distortion", "regime shift in multiples"],
    timeHorizon: "position",
  },
  {
    definition: {
      id: "specialty-quant",
      displayName: "Quant Analyst",
      category: "specialty",
      specialty: "quant",
      description: "Factor signals and historical distributions.",
    },
    agent: new QuantAnalyst(),
    risks: ["overfitting", "factor crowding"],
    timeHorizon: "swing",
  },
  {
    definition: {
      id: "specialty-macro",
      displayName: "Macro Analyst",
      category: "specialty",
      specialty: "macro",
      description: "Policy, growth, inflation regimes.",
    },
    agent: new MacroAnalyst(),
    risks: ["policy surprise", "lagged macro data"],
    timeHorizon: "strategic",
  },
  {
    definition: {
      id: "specialty-sentiment",
      displayName: "Sentiment Analyst",
      category: "specialty",
      specialty: "sentiment",
      description: "Narrative tone and crowd positioning.",
    },
    agent: new SentimentAnalyst(),
    risks: ["noisy social proxies", "sentiment mean reversion"],
    timeHorizon: "intraday",
  },
  {
    definition: {
      id: "specialty-news",
      displayName: "News Analyst",
      category: "specialty",
      specialty: "news",
      description: "Event flow and narrative acceleration.",
    },
    agent: new NewsAnalyst(),
    risks: ["headline lag", "false narratives"],
    timeHorizon: "intraday",
  },
  {
    definition: {
      id: "specialty-earnings",
      displayName: "Earnings Analyst",
      category: "specialty",
      specialty: "earnings",
      description: "Earnings surprises and revision path.",
    },
    agent: new EarningsAnalyst(),
    risks: ["guidance miss", "post-earnings drift reversal"],
    timeHorizon: "swing",
  },
  {
    definition: {
      id: "specialty-institutional-flows",
      displayName: "Institutional Flows Analyst",
      category: "specialty",
      specialty: "institutional-flows",
      description: "Institutional flow pressure when available.",
    },
    agent: new InstitutionalFlowsAnalyst(),
    risks: ["incomplete flow data", "lagged filings"],
    timeHorizon: "position",
  },
  {
    definition: {
      id: "specialty-volatility",
      displayName: "Volatility Analyst",
      category: "specialty",
      specialty: "volatility",
      description: "Realized/implied volatility regime.",
    },
    agent: new VolatilityAnalyst(),
    risks: ["vol of vol spikes", "skew mispricing"],
    timeHorizon: "swing",
  },
  {
    definition: {
      id: "specialty-correlations",
      displayName: "Correlations Analyst",
      category: "specialty",
      specialty: "correlations",
      description: "Cross-asset correlation regime.",
    },
    agent: new CorrelationsAnalyst(),
    risks: ["correlation breakdown", "contagion"],
    timeHorizon: "position",
  },
  {
    definition: {
      id: "specialty-liquidity",
      displayName: "Liquidity Analyst",
      category: "specialty",
      specialty: "liquidity",
      description: "Depth, spreads, participation capacity.",
    },
    agent: new LiquidityAnalyst(),
    risks: ["liquidity vacuum", "gap risk"],
    timeHorizon: "intraday",
  },
  {
    definition: {
      id: "specialty-risk",
      displayName: "Risk Manager",
      category: "specialty",
      specialty: "risk",
      description: "Downside asymmetry and risk-budget fit.",
    },
    agent: new RiskManager(),
    risks: ["tail events", "limit breaches"],
    timeHorizon: "position",
  },
  {
    definition: {
      id: "specialty-portfolio-manager",
      displayName: "Portfolio Manager",
      category: "specialty",
      specialty: "portfolio-manager",
      description: "Diversification and construction fit.",
    },
    agent: new PortfolioManager(),
    risks: ["concentration", "constraint conflicts"],
    timeHorizon: "strategic",
  },
  {
    definition: {
      id: "specialty-execution-supervisor",
      displayName: "Execution Supervisor",
      category: "specialty",
      specialty: "execution-supervisor",
      description: "Execution feasibility only — no order placement.",
    },
    agent: new ExecutionSupervisor(),
    risks: ["impact underestimation", "session mismatch"],
    timeHorizon: "intraday",
  },
];

export function createSpecialtyAgentRunners(): AgentRunner[] {
  return SPECIALTY_SPECS.map((spec) => ({
    definition: spec.definition,
    agent: spec.agent,
    run(context) {
      const result = spec.agent.analyze(context) as ReturnType<typeof createResult>;
      return toAgentConclusion(spec.definition, result, context, {
        risks: spec.risks,
        evidence: result.sources,
        timeHorizon: spec.timeHorizon,
      });
    },
  }));
}
