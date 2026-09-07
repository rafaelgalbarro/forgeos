import { RuleBasedInvestmentStrategy } from "../../application/rule-based-strategy";
import { clampScore } from "../../domain";
import { buildMetadata } from "./metadata";

export function createQualityStrategy(): RuleBasedInvestmentStrategy {
  return new RuleBasedInvestmentStrategy({
    id: "quality",
    defaultSizePct: 6,
    metadata: buildMetadata({
      strategyId: "quality",
      name: "Quality",
      assumptions: [
        "High ROE / quality composites predict durable relative performance",
        "Quality holds up better in risk-off regimes",
      ],
      limitations: [
        "May lag in speculative risk-on phases",
        "Accounting quality can be gamed",
      ],
      compatibleRegimes: ["bullish", "sideways", "risk-off", "low-volatility"],
      incompatibleRegimes: ["high-volatility"],
      risks: ["valuation compression", "earnings quality deterioration"],
      evidences: [
        "Quality factor literature (profitability, stability)",
        "ROE and composite quality screens",
      ],
    }),
    hooks: {
      score(context) {
        const quality = context.qualityScore ?? (context.roe !== undefined ? context.roe / 20 : 0.5);
        const score = clampScore((quality - 0.5) * 2);
        const bias = score > 0.15 ? "bullish" : score < -0.15 ? "bearish" : "neutral";
        return {
          score,
          bias,
          summary: `Quality score ${score.toFixed(3)} (composite=${quality.toFixed(3)}).`,
          evidence: [`qualityScore=${quality.toFixed(3)}`, `roe=${context.roe ?? "n/a"}`],
          metrics: { quality, roe: context.roe ?? 0, score },
        };
      },
      shouldEnter(context, analysis) {
        const quality = context.qualityScore ?? 0;
        if (quality < 0.65 || analysis.score < 0.3) return null;
        return {
          side: "long",
          conviction: Math.min(1, analysis.score + 0.2),
          rationale: "High-quality compounder long bias.",
          evidence: analysis.evidence,
        };
      },
    },
  });
}
