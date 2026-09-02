import { RuleBasedInvestmentStrategy } from "../../application/rule-based-strategy";
import { clampScore } from "../../domain";
import { buildMetadata } from "./metadata";

export function createGrowthStrategy(): RuleBasedInvestmentStrategy {
  return new RuleBasedInvestmentStrategy({
    id: "growth",
    defaultSizePct: 5,
    metadata: buildMetadata({
      strategyId: "growth",
      name: "Growth",
      assumptions: [
        "Earnings growth persists and is under-appreciated near-term",
        "Growth outperforms in risk-on / bullish regimes",
      ],
      limitations: [
        "Sensitive to discount-rate shocks",
        "Growth disappointments cause sharp de-ratings",
      ],
      compatibleRegimes: ["bullish", "risk-on", "low-volatility"],
      incompatibleRegimes: ["bearish", "risk-off", "high-volatility"],
      risks: ["duration risk", "earnings miss", "multiple compression"],
      evidences: [
        "Growth factor and earnings revision research",
        "Expected growth persistence heuristics",
      ],
    }),
    hooks: {
      score(context) {
        const growth = context.earningsGrowth ?? 0;
        const score = clampScore(growth / 25);
        const bias = score > 0.15 ? "bullish" : score < -0.1 ? "bearish" : "neutral";
        return {
          score,
          bias,
          summary: `Growth score ${score.toFixed(3)} from earnings growth ${growth.toFixed(1)}%.`,
          evidence: [`earningsGrowth=${growth.toFixed(2)}`],
          metrics: { earningsGrowth: growth, score },
        };
      },
      shouldEnter(context, analysis) {
        const growth = context.earningsGrowth ?? 0;
        if (growth < 12 || analysis.score < 0.35) return null;
        return {
          side: "long",
          conviction: Math.min(1, analysis.score),
          rationale: "Above-threshold earnings growth supports long growth exposure.",
          evidence: analysis.evidence,
        };
      },
    },
  });
}
