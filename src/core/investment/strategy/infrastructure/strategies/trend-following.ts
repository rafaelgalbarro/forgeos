import { RuleBasedInvestmentStrategy } from "../../application/rule-based-strategy";
import { clampScore, mean } from "../../domain";
import { buildMetadata } from "./metadata";

export function createTrendFollowingStrategy(): RuleBasedInvestmentStrategy {
  return new RuleBasedInvestmentStrategy({
    id: "trend-following",
    defaultSizePct: 6,
    metadata: buildMetadata({
      strategyId: "trend-following",
      name: "Trend Following",
      assumptions: [
        "Price trends persist over intermediate horizons",
        "Moving-average crossovers approximate directional regime",
      ],
      limitations: [
        "Whipsaws in sideways markets",
        "Late entry/exit relative to turning points",
      ],
      compatibleRegimes: ["bullish", "bearish", "risk-on", "risk-off"],
      incompatibleRegimes: ["sideways", "high-volatility"],
      risks: ["trend reversal", "gap risk", "false breakout after consolidation"],
      evidences: [
        "Academic and practitioner literature on time-series momentum",
        "Moving average crossover heuristics as portable trend proxies",
      ],
    }),
    hooks: {
      score(context) {
        const fast = context.smaFast ?? context.price;
        const slow = context.smaSlow ?? context.price;
        const spread = (fast - slow) / Math.max(slow, 1e-9);
        const mom = mean(context.returns) ?? 0;
        const score = clampScore(spread * 8 + mom * 4);
        const bias = score > 0.1 ? "bullish" : score < -0.1 ? "bearish" : "neutral";
        return {
          score,
          bias,
          summary: `Trend score ${score.toFixed(3)} from MA spread and recent returns.`,
          evidence: [
            `smaFast=${fast.toFixed(4)}`,
            `smaSlow=${slow.toFixed(4)}`,
            `maSpread=${spread.toFixed(4)}`,
          ],
          metrics: { maSpread: spread, momentum: mom, score },
        };
      },
      shouldEnter(context, analysis) {
        if (Math.abs(analysis.score) < 0.35) return null;
        const side = analysis.score > 0 ? "long" : "short";
        return {
          side,
          conviction: Math.min(1, Math.abs(analysis.score)),
          rationale: `Trend-following ${side} bias with score ${analysis.score.toFixed(3)}.`,
          evidence: analysis.evidence,
        };
      },
    },
  });
}
