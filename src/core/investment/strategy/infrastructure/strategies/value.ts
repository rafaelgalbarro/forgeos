import { RuleBasedInvestmentStrategy } from "../../application/rule-based-strategy";
import { clampScore } from "../../domain";
import { buildMetadata } from "./metadata";

export function createValueStrategy(): RuleBasedInvestmentStrategy {
  return new RuleBasedInvestmentStrategy({
    id: "value",
    defaultSizePct: 6,
    metadata: buildMetadata({
      strategyId: "value",
      name: "Value",
      assumptions: [
        "Cheap multiples relative to fundamentals mean-revert",
        "Value is rewarded over multi-year horizons",
      ],
      limitations: [
        "Value traps in structurally impaired businesses",
        "Can underperform for long stretches",
      ],
      compatibleRegimes: ["sideways", "transition", "risk-off", "bearish"],
      incompatibleRegimes: ["high-volatility"],
      risks: ["value trap", "prolonged underperformance", "leverage in cheap names"],
      evidences: [
        "Value factor literature (B/M, earnings yield)",
        "Multiples mean-reversion heuristics",
      ],
    }),
    hooks: {
      score(context) {
        const pe = context.peRatio ?? 20;
        const pb = context.pbRatio ?? 3;
        const peScore = (18 - pe) / 18;
        const pbScore = (2.5 - pb) / 2.5;
        const score = clampScore((peScore + pbScore) / 2);
        const bias = score > 0.15 ? "bullish" : score < -0.15 ? "bearish" : "neutral";
        return {
          score,
          bias,
          summary: `Value score ${score.toFixed(3)} (P/E=${pe.toFixed(1)}, P/B=${pb.toFixed(2)}).`,
          evidence: [`peRatio=${pe.toFixed(2)}`, `pbRatio=${pb.toFixed(2)}`],
          metrics: { peRatio: pe, pbRatio: pb, score },
        };
      },
      shouldEnter(context, analysis) {
        const pe = context.peRatio ?? 99;
        const pb = context.pbRatio ?? 99;
        if (pe > 16 || pb > 2.2 || analysis.score < 0.3) return null;
        return {
          side: "long",
          conviction: Math.min(1, analysis.score),
          rationale: "Attractive multiples support value long entry.",
          evidence: analysis.evidence,
        };
      },
    },
  });
}
