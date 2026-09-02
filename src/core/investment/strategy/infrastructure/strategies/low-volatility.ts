import { RuleBasedInvestmentStrategy } from "../../application/rule-based-strategy";
import { clampScore, stdev } from "../../domain";
import { buildMetadata } from "./metadata";

export function createLowVolatilityStrategy(): RuleBasedInvestmentStrategy {
  return new RuleBasedInvestmentStrategy({
    id: "low-volatility",
    defaultSizePct: 7,
    metadata: buildMetadata({
      strategyId: "low-volatility",
      name: "Low Volatility",
      assumptions: [
        "Lower-volatility assets can deliver attractive risk-adjusted returns",
        "Investors overweight lottery-like high-vol names",
      ],
      limitations: [
        "Underperforms in sharp risk-on melt-ups",
        "Crowding in defensive sectors",
      ],
      compatibleRegimes: ["low-volatility", "sideways", "risk-off", "bearish"],
      incompatibleRegimes: ["high-volatility", "risk-on"],
      risks: ["factor crowding", "rate shock to defensives", "relative underperformance"],
      evidences: [
        "Low-volatility anomaly research",
        "Volatility-sorted portfolio evidence",
      ],
    }),
    hooks: {
      score(context) {
        const vol = context.volatility ?? stdev(context.returns) ?? 0.25;
        const beta = context.beta ?? 1;
        const lowVolScore = clampScore((0.2 - vol) / 0.2 + (1 - beta) * 0.4);
        const bias = lowVolScore > 0.1 ? "bullish" : lowVolScore < -0.2 ? "bearish" : "neutral";
        return {
          score: lowVolScore,
          bias,
          summary: `Low-vol attractiveness ${lowVolScore.toFixed(3)} (vol=${vol.toFixed(3)}, beta=${beta.toFixed(2)}).`,
          evidence: [`volatility=${vol.toFixed(4)}`, `beta=${beta.toFixed(3)}`],
          metrics: { volatility: vol, beta, score: lowVolScore },
        };
      },
      shouldEnter(context, analysis) {
        const vol = context.volatility ?? 1;
        if (vol > 0.22 || analysis.score < 0.25) return null;
        return {
          side: "long",
          conviction: Math.min(1, analysis.score),
          rationale: "Prefer low-volatility long exposure.",
          evidence: analysis.evidence,
        };
      },
    },
  });
}
