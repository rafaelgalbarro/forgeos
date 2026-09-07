import type {
  CommitteeAction,
  InvestmentAgent,
  InvestmentAgentResult,
  InvestmentAnalysisContext,
  InvestmentCommitteeDecision,
  InvestmentStance,
  InvestmentTimeHorizon,
} from "../../domain/types";
import { clamp01, stanceFromScore } from "./base";

const CIO_WEIGHTS: Record<string, number> = {
  "Macro Analyst": 1.1,
  "Fundamental Analyst": 1.25,
  "Technical Analyst": 0.9,
  "Quant Analyst": 1.0,
  "News Analyst": 0.75,
  "Risk Manager": 1.3,
  "Portfolio Manager": 1.2,
  "Sentiment Analyst": 0.8,
  "Earnings Analyst": 1.15,
  "Institutional Flows Analyst": 1.05,
  "Volatility Analyst": 1.1,
  "Correlations Analyst": 0.95,
  "Liquidity Analyst": 1.0,
  "Execution Supervisor": 0.85,
  "USA Equities Desk": 1.0,
  "Europe Equities Desk": 1.0,
  "Asia Equities Desk": 1.0,
  "Forex Desk": 0.95,
  "ETF Desk": 0.95,
  "Indices Desk": 0.95,
  "Futures Desk": 0.9,
  "Options Desk": 0.9,
  "Bonds Desk": 0.95,
  "Commodities Desk": 0.9,
  "Crypto Desk": 0.5,
};

function getWeight(result: InvestmentAgentResult): number {
  return CIO_WEIGHTS[result.agent] ?? 1;
}

function deriveAction(
  consensus: InvestmentStance,
  decisionScore: { buy: number; sell: number; hold: number },
  confidence: number,
  results: InvestmentAgentResult[],
): CommitteeAction {
  const risk = results.find((r) => r.agent === "Risk Manager");
  const riskSell = risk?.score.sell ?? 0;
  if (consensus === "BUY") return "BUY";
  if (consensus === "HOLD") {
    if (decisionScore.sell > 0.35 && riskSell > 0.45) return "REDUCE";
    return "HOLD";
  }
  // SELL pressure
  if (confidence >= 0.7 && (decisionScore.sell >= 0.55 || riskSell >= 0.6)) return "EXIT";
  if (decisionScore.sell >= 0.4 && decisionScore.sell < 0.55) return "REDUCE";
  return "SELL";
}

function deriveTimeHorizon(results: InvestmentAgentResult[]): InvestmentTimeHorizon {
  const names = results.map((r) => r.agent);
  if (names.some((n) => n.includes("Macro") || n.includes("Portfolio"))) return "strategic";
  if (names.some((n) => n.includes("Fundamental") || n.includes("Earnings"))) return "position";
  if (names.some((n) => n.includes("News") || n.includes("Sentiment") || n.includes("Execution"))) {
    return "intraday";
  }
  return "swing";
}

function enrichDecision(
  core: Omit<
    InvestmentCommitteeDecision,
    "action" | "explanation" | "risks" | "timeHorizon" | "sourcesUsed" | "evidence" | "expectedPortfolioImpact"
  >,
  results: InvestmentAgentResult[],
): InvestmentCommitteeDecision {
  const action = deriveAction(core.consensus, {
    buy: core.buy_score,
    sell: core.sell_score,
    hold: core.hold_score,
  }, core.confidence, results);

  const sourcesUsed = [...new Set(results.flatMap((r) => [r.agent, ...r.sources]))];
  const evidence = results.map(
    (r) => `${r.agent}: buy=${r.score.buy.toFixed(2)} sell=${r.score.sell.toFixed(2)} hold=${r.score.hold.toFixed(2)} conf=${r.confidence.toFixed(2)}`,
  );
  const risks = [
    core.dissent > 0.35 ? "Elevated committee dissent" : "Committee dissent contained",
    core.confidence < 0.45 ? "Low aggregate confidence" : "Confidence above soft floor",
    ...results
      .filter((r) => r.agent.includes("Risk") || r.score.sell > 0.55)
      .map((r) => `${r.agent}: ${r.reasoning}`),
  ];

  const explanation =
    `Committee ${action} (stance ${core.consensus}) with confidence ${core.confidence.toFixed(2)}; ` +
    `buy=${core.buy_score.toFixed(2)} sell=${core.sell_score.toFixed(2)} hold=${core.hold_score.toFixed(2)}; ` +
    `dissent=${core.dissent.toFixed(2)}. ${results.length} agent conclusions weighed.`;

  const expectedPortfolioImpact =
    action === "BUY"
      ? "Potential increase in risk exposure if paper/shadow signal accepted."
      : action === "SELL" || action === "EXIT"
        ? "Potential reduction or exit of exposure if paper/shadow signal accepted."
        : action === "REDUCE"
          ? "Partial de-risk signal — size down if paper/shadow path applies."
          : "No material portfolio change expected under HOLD.";

  return {
    ...core,
    action,
    explanation,
    risks,
    timeHorizon: deriveTimeHorizon(results),
    sourcesUsed,
    evidence,
    expectedPortfolioImpact,
  };
}

function aggregate(results: InvestmentAgentResult[]): InvestmentCommitteeDecision {
  const weighted = results.map((result) => {
    const weight = getWeight(result);
    const trust = weight * result.confidence;
    return { result, weight, trust };
  });

  const trustSum = weighted.reduce((sum, item) => sum + item.trust, 0) || 1;
  const buy = weighted.reduce((sum, item) => sum + item.result.score.buy * item.trust, 0) / trustSum;
  const sell = weighted.reduce((sum, item) => sum + item.result.score.sell * item.trust, 0) / trustSum;
  const hold = weighted.reduce((sum, item) => sum + item.result.score.hold * item.trust, 0) / trustSum;

  const decisionScore = { buy: clamp01(buy), sell: clamp01(sell), hold: clamp01(hold) };
  const consensus = stanceFromScore(decisionScore);
  const confidence = clamp01(weighted.reduce((sum, item) => sum + item.trust, 0) / weighted.reduce((sum, item) => sum + item.weight, 0));

  const stances = weighted.map((item) => ({ ...item, stance: stanceFromScore(item.result.score) }));
  const consensusTrust = stances
    .filter((item) => item.stance === consensus)
    .reduce((sum, item) => sum + item.trust, 0);
  const dissent = clamp01(1 - consensusTrust / trustSum);

  const minority_report = stances
    .filter((item) => item.stance !== consensus)
    .map((item) => ({
      agent: item.result.agent,
      stance: item.stance as InvestmentStance,
      reasoning: item.result.reasoning,
    }));

  return enrichDecision(
    {
      buy_score: decisionScore.buy,
      sell_score: decisionScore.sell,
      hold_score: decisionScore.hold,
      confidence,
      dissent,
      consensus,
      minority_report,
    },
    results,
  );
}

export class ChiefInvestmentOfficer implements InvestmentAgent {
  analyze(context: InvestmentAnalysisContext) {
    const subordinateResults = context.subordinateResults ?? [];
    if (subordinateResults.length === 0) {
      throw new Error("Chief Investment Officer requires subordinateResults.");
    }

    const committeeDecision = aggregate(subordinateResults);
    return {
      agent: "Chief Investment Officer",
      score: {
        buy: committeeDecision.buy_score,
        sell: committeeDecision.sell_score,
        hold: committeeDecision.hold_score,
      },
      confidence: committeeDecision.confidence,
      reasoning: `Consensus=${committeeDecision.consensus}; dissent=${committeeDecision.dissent.toFixed(2)}.`,
      sources: subordinateResults.map((result) => result.agent),
    };
  }

  aggregate(subordinateResults: InvestmentAgentResult[]): InvestmentCommitteeDecision {
    if (subordinateResults.length === 0) {
      throw new Error("Chief Investment Officer requires subordinateResults.");
    }
    return aggregate(subordinateResults);
  }
}
