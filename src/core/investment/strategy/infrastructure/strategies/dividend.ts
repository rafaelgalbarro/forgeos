import { RuleBasedInvestmentStrategy } from "../../application/rule-based-strategy";
import { clampScore } from "../../domain";
import { buildMetadata } from "./metadata";

export function createDividendStrategy(): RuleBasedInvestmentStrategy {
  return new RuleBasedInvestmentStrategy({
    id: "dividend",
    defaultSizePct: 6,
    metadata: buildMetadata({
      strategyId: "dividend",
      name: "Dividend",
      assumptions: [
        "Sustainable dividend yield contributes to total return",
        "Income strategies suit defensive / sideways regimes",
      ],
      limitations: [
        "Dividend cuts destroy thesis quickly",
        "Interest-rate sensitivity of yield proxies",
      ],
      compatibleRegimes: ["sideways", "risk-off", "bearish", "low-volatility"],
      incompatibleRegimes: ["high-volatility", "risk-on"],
      risks: ["dividend cut", "rate shock", "sector concentration"],
      evidences: [
        "Dividend yield and payout sustainability research",
        "Income-factor heuristics",
      ],
    }),
    hooks: {
      score(context) {
        const yieldPct = context.dividendYield ?? 0;
        const quality = context.qualityScore ?? 0.5;
        const score = clampScore((yieldPct - 2) / 4 + (quality - 0.5));
        const bias = score > 0.1 ? "bullish" : score < -0.15 ? "bearish" : "neutral";
        return {
          score,
          bias,
          summary: `Dividend score ${score.toFixed(3)} (yield=${yieldPct.toFixed(2)}%).`,
          evidence: [`dividendYield=${yieldPct.toFixed(2)}`, `qualityScore=${quality.toFixed(3)}`],
          metrics: { dividendYield: yieldPct, quality, score },
        };
      },
      shouldEnter(context, analysis) {
        const yieldPct = context.dividendYield ?? 0;
        if (yieldPct < 2.5 || analysis.score < 0.25) return null;
        return {
          side: "long",
          conviction: Math.min(1, analysis.score + 0.15),
          rationale: "Sustainable yield supports dividend long entry.",
          evidence: analysis.evidence,
        };
      },
    },
  });
}
