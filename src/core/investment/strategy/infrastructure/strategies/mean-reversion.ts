import { RuleBasedInvestmentStrategy } from "../../application/rule-based-strategy";
import { clampScore } from "../../domain";
import { buildMetadata } from "./metadata";

export function createMeanReversionStrategy(): RuleBasedInvestmentStrategy {
  return new RuleBasedInvestmentStrategy({
    id: "mean-reversion",
    defaultSizePct: 4,
    metadata: buildMetadata({
      strategyId: "mean-reversion",
      name: "Mean Reversion",
      assumptions: [
        "Prices oscillate around a short-term equilibrium",
        "RSI extremes are informative in range-bound regimes",
      ],
      limitations: [
        "Fails in strong trending markets",
        "Overshoot can persist longer than capital allows",
      ],
      compatibleRegimes: ["sideways", "low-volatility"],
      incompatibleRegimes: ["bullish", "bearish", "high-volatility"],
      risks: ["trend continuation against fade", "gap through mean"],
      evidences: [
        "Mean-reversion and oscillator literature",
        "RSI extreme fade heuristics",
      ],
    }),
    hooks: {
      score(context) {
        const rsi = context.rsi ?? 50;
        const deviation = (50 - rsi) / 50;
        const score = clampScore(deviation);
        const bias = score > 0.15 ? "bullish" : score < -0.15 ? "bearish" : "neutral";
        return {
          score,
          bias,
          summary: `Mean-reversion score ${score.toFixed(3)} from RSI ${rsi.toFixed(1)}.`,
          evidence: [`rsi=${rsi.toFixed(2)}`],
          metrics: { rsi, score },
        };
      },
      shouldEnter(context, analysis) {
        const rsi = context.rsi ?? 50;
        if (rsi > 30 && rsi < 70) return null;
        if (Math.abs(analysis.score) < 0.35) return null;
        const side = rsi < 30 ? "long" : "short";
        return {
          side,
          conviction: Math.min(1, Math.abs(analysis.score)),
          rationale: `Fade RSI extreme (${rsi.toFixed(1)}) via mean reversion.`,
          evidence: analysis.evidence,
        };
      },
    },
  });
}
